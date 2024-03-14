class HTTPSession extends CurlSession {
  constructor() {
    super();
    this.set_connections(50, 40);
  }

  request_async(url, params, body) {
    return new Promise((resolve, reject) => {
      let stream_controller;
      let http_handle;
      let response_obj;
      let aborted = false;
  
      //handle abort signals
      if (params.signal instanceof AbortSignal) {
        params.signal.addEventListener("abort", () => {
          if (aborted) return;
          aborted = true;
          _cleanup_handle(http_handle);
          if (!response_obj) {
            reject(new DOMException("The operation was aborted."));
          }
          else {
            stream_controller.error("The operation was aborted.");
          }
        });
      }
  
      let stream = new ReadableStream({
        start(controller) {
          stream_controller = controller;
        }
      });
      
      let data_callback = (new_data) => {
        try {
          stream_controller.enqueue(new_data);  
        }
        catch (e) {
          //the readable stream has been closed elsewhere, so cancel the request
          if (e instanceof TypeError) {
            _cleanup_handle(http_handle);
          }
          else {
            throw e;
          }
        }
      }
      let headers_callback = () => {
        let response_json = c_func_str(_http_get_info, [http_handle]);
        response_obj = this.constructor.create_response(stream, JSON.parse(response_json));
        resolve(response_obj);
      }
      let finish_callback = (error) => {
        if (error != 0) {
          error_msg(`Request "${url}" failed with error code ${error}: ${get_error_str(error)}`);
          reject(`Request failed with error code ${error}: ${get_error_str(error)}`);
        }
        try {
          stream_controller.close();
        } //this will only fail if the stream is already errored or closed, which isn't a problem
        catch {}
        this.remove_request(http_handle);
      }
  
      let body_length = body ? body.length : 0;
      let params_json = JSON.stringify(params);
      
      http_handle = this.create_request(url, data_callback, finish_callback, headers_callback);
      c_func(_http_set_options, [http_handle, params_json, body, body_length]);
      this.start_request(http_handle);
    });
  }

  async fetch(url, params={}) {
    let body = await this.constructor.create_options(params);
    return await this.request_async(url, params, body);
  }

  static create_response(response_data, response_info) {
    response_info.ok = response_info.status >= 200 && response_info.status < 300;
    response_info.statusText = status_messages[response_info.status] || "";
    if (response_info.status === 204 || response_info.status === 205) {
      response_data = null;
    }

    //construct base response object
    let response_obj = new Response(response_data, response_info);
    for (let key in response_info) {
      if (key == "headers") continue;
      Object.defineProperty(response_obj, key, {
        writable: false,
        value: response_info[key]
      });
    }

    //create headers object
    Object.defineProperty(response_obj, "headers", {
      writable: false,
      value: new Headers()
    });
    Object.defineProperty(response_obj, "raw_headers", {
      writable: false,
      value: response_info.headers
    });
    for (let [header_name, header_value] of response_info.headers) {
      response_obj.headers.append(header_name, header_value);
    }
    
    return response_obj;
  }

  static async create_options(params) {
    let body = null;
    let request_obj = new Request("/", params);
    let array_buffer = await request_obj.arrayBuffer();
    if (array_buffer.byteLength > 0) {
      body = new Uint8Array(array_buffer);
    }
    
    let headers = params.headers || {};
    if (params.headers instanceof Headers) {
      for(let [key, value] of headers) {
        headers[key] = value;
      }
    }
    params.headers = new HeadersDict(headers);

    if (params.referrer) {
      params.headers["Referer"] = params.referrer;
    }
    if (!params.headers["User-Agent"]) {
      params.headers["User-Agent"] = navigator.userAgent;
    }
    if (body) {
      params.headers["Content-Type"] = request_obj.headers.get("Content-Type");
    }

    return body;
  }
}