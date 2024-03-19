class HTTPSession extends CurlSession {
  constructor(options={}) {
    super();
    this.options = options;

    this.set_connections(50, 40);
    this.import_cookies();
  }

  import_cookies() {
    if (this.options.enable_cookies) {
      this.cookie_filename = `/cookies_${Math.random()}.txt`;
      if (this.options.cookie_jar) {
        FS.writeFile(this.cookie_filename, this.options.cookie_jar);
      }
    }
  }

  export_cookies() {
    if (!this.cookie_filename) return "";

    try {
      return FS.readFile(this.cookie_filename, {encoding: "utf8"});
    }
    catch (e) {
      if (e.errno === 44) return "";
      throw e;
    }
  }

  close() {
    if (this.cookie_filename) {
      try {
        FS.unlink(this.cookie_filename);
      }
      catch (e) {}
    }
    super.close();
  }

  request_async(url, params, body) {
    return new Promise((resolve, reject) => {
      let http_handle;
  
      let headers_callback = (stream) => {
        let response_json = c_func_str(_http_get_info, [http_handle]);
        let response = this.constructor.create_response(stream, JSON.parse(response_json));
        
        if (params.redirect === "error" && response.status >= 300 && response.status < 400) {
          finish_callback(-2);
          return;
        }
        resolve(response);
      }
      let finish_callback = (error) => {
        if (error > 0) {
          error_msg(`Request "${url}" failed with error code ${error}: ${get_error_str(error)}`);
          reject(`Request failed with error code ${error}: ${get_error_str(error)}`);
        }
        else if (error === -1) {
          reject(new DOMException("The operation was aborted."));
        }
        else if (error === -2) {
          reject("Request failed because redirects were disallowed.");
        }
        this.remove_request(http_handle);
      }
  
      let body_length = body ? body.length : 0;
      let params_json = JSON.stringify(params);
      
      http_handle = this.stream_response(url, headers_callback, finish_callback, params.signal);
      c_func(_http_set_options, [http_handle, params_json, body, body_length]);
      if (this.cookie_filename && params.credentials !== "omit") {
        c_func(_http_set_cookie_jar, [http_handle, this.cookie_filename]);
      }

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