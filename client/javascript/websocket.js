class CurlWebSocket {
  constructor(url, protocols=[], options={}) {
    check_loaded(true);
    if (!url.startsWith("wss://") && !url.startsWith("ws://")) {
      throw new SyntaxError("invalid url");
    }
    
    this.url = url;
    this.protocols = protocols;
    this.options = options;

    this.onopen = () => {};
    this.onerror = () => {};
    this.onmessage = () => {};
    this.onclose = () => {};

    this.connected = false;
    this.event_loop = null;
    this.recv_buffer = [];

    this.connect();
  }

  connect() {
    let data_callback = () => {};
    let finish_callback = (error, response_info) => {
      if (error === 0) {
        this.connected = true;
        this.event_loop = setInterval(() => {
          let data = this.recv();
          if (data !== null) this.onmessage(data);
        }, 0);
        this.onopen();
      }
      else {
        this.status = this.CLOSED;
        this.cleanup(error);
      }
    }
    let request_options = {
      headers: this.options.headers || {}
    };
    if (this.protocols) {
      request_options.headers["Sec-Websocket-Protocol"] = this.protocols.join(", ");
    }
    if (this.options.verbose) {
      request_options._libcurl_verbose = 1;
    }
    this.http_handle = perform_request(this.url, request_options, data_callback, finish_callback, null);
  }

  recv() {
    let buffer_size = 64*1024;
    let result_ptr = _recv_from_websocket(this.http_handle, buffer_size);
    let data_ptr = _get_result_buffer(result_ptr);
    let result_code = _get_result_code(result_ptr);
    let returned_data = null;

    function free_result() {
      _free(data_ptr);
      _free(result_ptr);
    }
    console.log(result_code);

    if (result_code === 0) { //CURLE_OK - data received 
      if (_get_result_closed(result_ptr)) {
        free_result();
        this.cleanup();
        return returned_data;
      }

      let data_size = _get_result_size(result_ptr);
      let data_heap = Module.HEAPU8.subarray(data_ptr, data_ptr + data_size);
      let data = new Uint8Array(data_heap);

      console.log(data, data_size, buffer_size, _get_result_bytes_left(result_ptr));
      
      this.recv_buffer.push(data);
      if (data_size !== buffer_size && !_get_result_bytes_left(result_ptr)) { //message finished
        let full_data = merge_arrays(this.recv_buffer);
        let is_text = _get_result_is_text(result_ptr)
        this.recv_buffer = [];
        if (is_text) {
          returned_data = new TextDecoder().decode(full_data);
        }
        else {
          returned_data = full_data;
        }
      }
    }
    
    //CURLE_GOT_NOTHING, CURLE_RECV_ERROR, CURLE_SEND_ERROR - socket closed
    else if (result_code === 52 || result_code === 55 || result_code === 56) {
      this.cleanup();
    }
    
    free_result();
    return returned_data;
  }

  cleanup(error=false) {
    if (this.http_handle) _cleanup_handle(this.http_handle);
    clearInterval(this.event_loop);
    this.connected = false;

    if (error) {
      this.onerror(error);
    }
    else {
      this.onclose();
    }
  }

  send(data) {
    let is_text = typeof data === "string";
    if (!this.connected) {
      throw new DOMException("websocket not connected");
    }

    if (is_text) {
      data = new TextEncoder().encode(data);
    }
    let data_ptr = allocate_array(data);
    let data_len = data.length;
    _send_to_websocket(this.http_handle, data_ptr, data_len, is_text);
    _free(data_ptr);
  }

  close() {
    this.cleanup();
  }
}