class CurlWebSocket extends CustomWebSocket {
  constructor(url, protocols=[], debug=false) {
    super(url, protocols);
    check_loaded(true);
    if (!url.startsWith("wss://") && !url.startsWith("ws://")) {
      throw new SyntaxError("invalid url");
    }
    
    this.protocols = protocols;
    this.debug = debug;
    this.recv_buffer = [];

    this.connect();
  }

  connect() {
    let data_callback = () => {};
    let finish_callback = (error, response_info) => {
      if (error === 0) {
        this.status = this.OPEN;
        this.open_callback();
        this.recv_loop();
      }
      else {
        this.status = this.CLOSED;
        this.cleanup(error);
      }
    }
    let options = {};
    if (this.protocols) {
      options.headers = {
        "Sec-Websocket-Protocol": this.protocols.join(", "),
      };
    }
    if (this.debug) {
      options._libcurl_verbose = 1;
    }
    this.http_handle = perform_request(this.url, options, data_callback, finish_callback, null);
  }

  custom_recv() {
    let buffer_size = 64*1024;
    let result_ptr = _recv_from_websocket(this.http_handle, buffer_size);
    let data_ptr = _get_result_buffer(result_ptr);
    let result_code = _get_result_code(result_ptr);

    if (result_code == 0) { //CURLE_OK - data received 
      if (_get_result_closed(result_ptr)) {
        _free(data_ptr);
        _free(result_ptr);
        this.cleanup();
        return;
      }

      let data_size = _get_result_size(result_ptr);
      let data_heap = Module.HEAPU8.subarray(data_ptr, data_ptr + data_size);
      let data = new Uint8Array(data_heap);
      
      this.recv_buffer.push(data);
      if (data_size !== buffer_size && !_get_result_bytes_left(result_ptr)) { //message finished
        let full_data = merge_arrays(this.recv_buffer);
        let is_text = _get_result_is_text(result_ptr)
        this.recv_buffer = [];
        return {
          success: true,
          data: full_data,
          is_text: is_text
        }
      }
    }

    if (result_code == 52) { //CURLE_GOT_NOTHING - socket closed
      this.cleanup();
    }
    
    _free(data_ptr);
    _free(result_ptr);

    return {
      success: false,
      data: null,
      is_text: false
    }
  }

  cleanup(error=false) {
    if (this.http_handle) _cleanup_handle(this.http_handle);
    clearInterval(this.event_loop);
    this.close_callback(error);
  }

  custom_send(data_array, is_text) {
    let data_ptr = allocate_array(data_array);
    let data_len = data_array.length;
    _send_to_websocket(this.http_handle, data_ptr, data_len, is_text);
    _free(data_ptr);
  }

  custom_close() {
    this.cleanup();
    this.status = this.CLOSED;
  }
}