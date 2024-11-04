class CurlSession {
  constructor(options={}) {
    check_loaded(true);

    this.options = options;
    this.session_ptr = _session_create();
    this.active_requests = 0;
    this.event_loop = null;
    this.requests_list = [];
    this.to_remove = [];
  
    this.end_callback_ptr = Module.addFunction((request_id, error) => {
      this.end_callback(request_id, error);
    }, "vii");
    this.headers_callback_ptr = Module.addFunction((request_id, chunk_ptr, chunk_size) => {
      this.headers_callback(request_id, chunk_ptr, chunk_size)
    }, "viii");
    this.data_callback_ptr = Module.addFunction((request_id, chunk_ptr, chunk_size) => {
      this.data_callback(request_id, chunk_ptr, chunk_size)
    }, "viii");
    this.request_callbacks = {};
    this.last_request_id = 0;
  }

  assert_ready() {
    if (!this.session_ptr) {
      throw new Error("session has been removed");
    }
  }

  set_connections(connections_limit, cache_limit, host_conn_limit=0) {
    this.assert_ready();
    _session_set_options(this.session_ptr, connections_limit, cache_limit, host_conn_limit);
  }

  end_callback(request_id, error) {
    this.active_requests--;
    this.request_callbacks[request_id].end(error);
    delete this.request_callbacks[request_id];
  }

  data_callback(request_id, chunk_ptr, chunk_size) {
    let data = Module.HEAPU8.subarray(chunk_ptr, chunk_ptr + chunk_size);
    let chunk = new Uint8Array(data);
    this.request_callbacks[request_id].data(chunk);
  }

  headers_callback(request_id, chunk_ptr, chunk_size) {
    let data = Module.HEAPU8.subarray(chunk_ptr, chunk_ptr + chunk_size);
    let chunk = new Uint8Array(data);
    this.request_callbacks[request_id].headers(chunk);
  }

  create_request(url, js_data_callback, js_end_callback, js_headers_callback) {
    this.assert_ready();
    let request_id = this.last_request_id++;
    this.request_callbacks[request_id] = {
      end: js_end_callback,
      data: js_data_callback,
      headers: js_headers_callback
    }
  
    let request_ptr = c_func(_create_request, [
      url, request_id, this.data_callback_ptr, this.end_callback_ptr, this.headers_callback_ptr
    ]);
    return request_ptr;
  }

  remove_request_now(request_ptr) {
    if (this.session_ptr) {
      _session_remove_request(this.session_ptr, request_ptr);
    }
    _request_cleanup(request_ptr);
    
    let request_index = this.requests_list.indexOf(request_ptr);
    if (request_index !== -1) {
      this.requests_list.splice(request_index, 1);
    }
  }

  //remove the request on the next iteration of the loop
  remove_request(request_ptr) {
    this.assert_ready();
    setTimeout(() => {
      this.remove_request_now(request_ptr);
    }, 1)
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
      this.event_loop_func();
    }, 0);
  }

  event_loop_func() {
    let libcurl_active = _session_get_active(this.session_ptr);
    if (libcurl_active || this.active_requests) {
      _session_perform(this.session_ptr);
    }
    else {
      clearInterval(this.event_loop);
      this.event_loop = null;
    }
  }

  close_now() {
    for (let request_ptr of this.requests_list) {
      this.remove_request_now(request_ptr);
    }
    _session_cleanup(this.session_ptr);
    this.session_ptr = null;
    Module.removeFunction(this.end_callback_ptr);
    Module.removeFunction(this.headers_callback_ptr);
    Module.removeFunction(this.data_callback_ptr);
  }

  close() {
    this.assert_ready();
    setTimeout(() => {
      this.close_now();
    }, 1);
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
        real_end_callback(-1);
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
        if (aborted) return;
        aborted = true;
        if (e instanceof TypeError) {
          end_callback(-1);
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

      try {
        stream_controller.close();
      }
      catch {}
      end_callback(error);
    }

    return this.create_request(url, real_data_callback, real_end_callback, () => {});
  }
}