class TLSSocket extends CustomWebSocket {
  constructor(hostname, port, debug) {
    super();
    this.hostname = hostname;
    this.port = port;
    this.url = `https://${hostname}:${port}`;
    this.debug = debug;

    this.connect();
  }

  connect() {
    let data_callback = () => {};
    let finish_callback = (error, response_info) => {
      this.status = this.OPEN;
      if (error === 0) {
        this.open_callback();
        this.recv_loop();
      }
      else {
        this.cleanup(error);
      }
    }
    let options = {
      _connect_only: 1,
    }
    if (this.debug) options._libcurl_verbose = 1;

    this.http_handle = perform_request(this.url, options, data_callback, finish_callback, null);
  }

  custom_recv() {
    let buffer_size = 64*1024;
    let result_ptr = _recv_from_socket(this.http_handle, buffer_size);
    let data_ptr = _get_result_buffer(result_ptr);
    let result_code = _get_result_code(result_ptr);

    if (result_code == 0) { //CURLE_OK - data received 
      if (_get_result_closed(result_ptr)) {
        this.close_callback();
        return;
      }

      let data_size = _get_result_size(result_ptr);
      let data_heap = Module.HEAPU8.subarray(data_ptr, data_ptr + data_size);
      let data = new Uint8Array(data_heap);

      let message_event = new MessageEvent("message", {data: data});
      this.dispatchEvent(message_event);
    }

    _free(data_ptr);
    _free(result_ptr);
  }

  custom_send(data_array) {
    let data_ptr = allocate_array(data_array);
    let data_len = data_array.length;
    _send_to_socket(this.http_handle, data_ptr, data_len);
    _free(data_ptr);
  }

  cleanup(error=false) {
    if (this.http_handle) _cleanup_handle(this.http_handle);
    clearInterval(this.event_loop);
    this.close_callback(error);
  }

  custom_close() {
    this.cleanup();
    this.status = this.CLOSED;
  }
}