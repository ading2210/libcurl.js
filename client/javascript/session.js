class CurlSession {
  constructor(options={}) {
    check_loaded(true);

    this.options = options;
    this.session_ptr = _session_create();
    this.active_requests = 0;
    this.event_loop = null;
    this.requests_list = [];
  }

  assert_ready() {
    if (!this.session_ptr) {
      throw "session has been removed";
    }
  }

  set_connections(connections_limit, cache_limit) {
    this.assert_ready();
    _session_set_options(this.session_ptr, connections_limit, cache_limit);
  }

  create_request(url, js_data_callback, js_end_callback, js_headers_callback) {
    this.assert_ready();
    let end_callback_ptr;
    let data_callback_ptr;
    let headers_callback_ptr;
  
    let end_callback = (error) => {
      Module.removeFunction(end_callback_ptr);
      Module.removeFunction(data_callback_ptr);
      
      this.active_requests--;
      js_end_callback(error);
    }
  
    let data_callback = (chunk_ptr, chunk_size) => {
      let data = Module.HEAPU8.subarray(chunk_ptr, chunk_ptr + chunk_size);
      let chunk = new Uint8Array(data);
      js_data_callback(chunk);
    }
  
    let headers_callback = (chunk_ptr, chunk_size) => {
      let data = Module.HEAPU8.subarray(chunk_ptr, chunk_ptr + chunk_size);
      let chunk = new Uint8Array(data);
      js_headers_callback(chunk);
    }
  
    end_callback_ptr = Module.addFunction(end_callback, "vi");
    headers_callback_ptr = Module.addFunction(headers_callback, "vii");
    data_callback_ptr = Module.addFunction(data_callback, "vii");
    let request_ptr = c_func(_create_request, [url, data_callback_ptr, end_callback_ptr, headers_callback_ptr]);
    
    return request_ptr;
  }

  remove_request(request_ptr) {
    this.assert_ready();
    _session_remove_request(this.session_ptr, request_ptr);

    let request_index = this.requests_list.indexOf(request_ptr);
    if (request_index !== -1) {
      this.requests_list.splice(request_index, 1);
    }
  }

  start_request(request_ptr) {
    this.assert_ready();
    _session_add_request(this.session_ptr, request_ptr);
    _session_perform(this.session_ptr);

    this.active_requests++;
    this.requests_list.push(request_ptr);
  
    if (this.event_loop) {
      return;
    }
    
    this.event_loop = setInterval(() => {
      let libcurl_active = _session_get_active(this.session_ptr);
      if (libcurl_active || this.active_requests) {
        _session_perform(this.session_ptr);
      }
      else {
        clearInterval(this.event_loop);
        this.event_loop = null;
      }
    }, 0);
  }

  close() {
    this.assert_ready();
    for (let request_ptr of this.requests_list) {
      this.remove_request(request_ptr);
    }
    _session_cleanup(this.session_ptr);
    this.session_ptr = null;
  }

  //wrap request callbacks using a readable stream and return the new callbacks
  stream_response(url, headers_callback, end_callback, abort_signal) {
    let stream_controller;
    let aborted = false;
    let headers_received = false;

    let stream = new ReadableStream({
      start(controller) {
        stream_controller = controller;
      }
    });

    if (abort_signal instanceof AbortSignal) {
      abort_signal.addEventListener("abort", () => {
        if (aborted) return;
        aborted = true;
        if (headers_received) {
          stream_controller.error("The operation was aborted.");
        }
        real_abort_callback();
      });
    }

    let real_data_callback = (new_data) => {
      if (!headers_received) {
        headers_received = true;
        headers_callback(stream);
      }

      try {
        stream_controller.enqueue(new_data);
      }
      catch (e) {
        //the readable stream has been closed elsewhere, so cancel the request
        if (e instanceof TypeError) {
          finish_callback(-1);
        }
        else {
          throw e;
        }
      }
    }

    let real_end_callback = (error) => {
      if (!headers_received && error === 0) {
        headers_received = true;
        headers_callback(stream);
      }

      console.log(error);

      try {
        stream_controller.close();
      }
      catch {}
      end_callback(error);
    }

    return this.create_request(url, real_data_callback, real_end_callback, () => {});
  }
}