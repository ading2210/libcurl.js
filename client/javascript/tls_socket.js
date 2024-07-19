//currently broken

class TLSSocket extends CurlSession {
  constructor(hostname, port, options={}) {
    super();

    this.hostname = hostname;
    this.port = port;
    this.url = `https://${hostname}:${port}`;
    this.options = options;

    this.onopen = () => {};
    this.onerror = () => {};
    this.onmessage = () => {};
    this.onclose = () => {};

    this.connected = false;
    this.recv_loop = null;

    try {
      check_proxy(this.options.proxy);
      this.set_connections(1, 0);
      this.connect();
    }
    catch (e) {
      this.cleanup(true);
      throw e;
    }
  }

  connect() {
    let data_callback = () => {};
    let headers_callback = () => {};
    let finish_callback = (error) => {
      if (error === 0) {
        this.connected = true;
        this.recv_loop = setInterval(() => {
          let data = this.recv();
          if (data != null) this.onmessage(data);
        }, 0);
        this.onopen();
      }
      else {
        this.cleanup(error);
      }
    }

    this.http_handle = this.create_request(this.url, data_callback, finish_callback, headers_callback);
    _tls_socket_set_options(this.http_handle, +this.options.verbose);
    if (this.options.proxy) {
      c_func_str(_request_set_proxy, [this.http_handle, this.options.proxy]);
    }
    this.start_request(this.http_handle);
  }

  recv() {
    let buffer_size = 64*1024;
    let result_ptr = _recv_from_socket(this.http_handle, buffer_size);
    let data_ptr = _get_result_buffer(result_ptr);
    let result_code = _get_result_code(result_ptr);
    let result_closed = _get_result_closed(result_ptr);

    if (result_code === 0 && !result_closed) { //CURLE_OK - data received 
      let data_size = _get_result_size(result_ptr);
      let data_heap = Module.HEAPU8.subarray(data_ptr, data_ptr + data_size);
      let data = new Uint8Array(data_heap);
      this.onmessage(data)
    }
    
    else if (result_code === 0 && result_closed) {
      this.cleanup();
    }

    else if (result_code != 81) {
      this.cleanup(result_code);
    }

    _free(data_ptr);
    _free(result_ptr);
  }

  send(data_array) {
    if (!this.connected) return;
    let data_ptr = allocate_array(data_array);
    let data_len = data_array.length;
    _send_to_socket(this.http_handle, data_ptr, data_len);
    _free(data_ptr);
  }

  cleanup(error=false) {
    if (this.http_handle) {
      this.remove_request(this.http_handle);
      this.http_handle = null;
      super.close();
    }
    else return;
    
    clearInterval(this.recv_loop);
    this.connected = false;

    if (error) {
      this.onerror(error);
    }
    else {
      this.onclose();
    }
  }

  close() {
    this.cleanup();
  }
}