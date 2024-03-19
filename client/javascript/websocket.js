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
    let response_info;
    let data_callback = () => {};
    let headers_callback = (info) => {
      response_info = info;
    }
    let finish_callback = (error) => {
      if (error === 0) {
        this.connected = true;
        this.event_loop = setInterval(() => {
          let data = this.recv();
          if (data !== null) this.onmessage(data);
        }, 0);
        this.onopen();
      }
      else {
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
    this.http_handle = perform_request(this.url, request_options, data_callback, finish_callback, headers_callback, null);
  }

  recv() {
    let buffer_size = 64*1024;
    let result_ptr = _recv_from_websocket(this.http_handle, buffer_size);
    let data_ptr = _get_result_buffer(result_ptr);
    let result_code = _get_result_code(result_ptr);
    let result_closed = _get_result_closed(result_ptr);
    let returned_data = null;

    //CURLE_OK - data received 
    if (result_code === 0 && !result_closed) {
      if (_get_result_closed(result_ptr)) {
        _free(data_ptr);
        _free(result_ptr);
        this.cleanup();
        return returned_data;
      }

      let data_size = _get_result_size(result_ptr);
      let data_heap = Module.HEAPU8.subarray(data_ptr, data_ptr + data_size);
      let data = new Uint8Array(data_heap);
      
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
    
    // websocket was cleanly closed by the server
    else if (result_code === 0 && result_closed) {
      this.cleanup();
    }

    //code is not CURLE_AGAIN - an error must have occurred
    else if (result_code !== 81) {
      this.cleanup(result_code);
    }
    
    _free(data_ptr);
    _free(result_ptr);
    return returned_data;
  }

  cleanup(error=0) {
    if (this.http_handle) _cleanup_handle(this.http_handle);
    else return;

    clearInterval(this.event_loop);
    this.connected = false;

    if (error) {
      error_msg(`Websocket "${this.url}" encountered error code ${error}: ${get_error_str(error)}`);
      this.onerror(error);
    }
    else {
      this.onclose();
    }
  }

  send(data) {
    let is_text = typeof data === "string";
    if (!this.connected) return;

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