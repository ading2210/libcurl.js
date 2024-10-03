class HTTPSession extends CurlSession {
  constructor(options={}) {
    super();
    this.options = options;
    this.base_url = undefined;

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
      let http_handle = null;
      let body_ptr = null; 

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
        if (body_ptr != null) {
          _free(body_ptr);
          body_ptr = null;
        }
        if (http_handle == null) {
          //a race condition with aborting requests may lead to this state
          //if the request gets cancelled right before it finishes normally, this function gets called twice
          //fortunately, we can just return here to prevent anything bad from happening
          return;
        }
        if (error > 0) {
          error_msg(`Request "${url}" failed with error code ${error}: ${get_error_str(error)}`);
          reject(new TypeError(`Request failed with error code ${error}: ${get_error_str(error)}`));
        }
        else if (error === -1) {
          reject(new DOMException("The operation was aborted."));
        }
        else if (error === -2) {
          reject(new TypeError("Request failed because redirects were disallowed."));
        }
        this.remove_request(http_handle);
        http_handle = null;
      }

      let url_obj = new URL(url);
      let tls = url_obj.protocol === "https:";
      params.headers["Host"] = url_obj.host;
      
      body_ptr = body ? allocate_array(body) : null;
      let body_length = body ? body.length : 0;
      let params_json = JSON.stringify(params);

      http_handle = this.stream_response(url, headers_callback, finish_callback, params.signal, tls);
      c_func(_http_set_options, [http_handle, params_json, body_ptr, body_length]);
      if (this.cookie_filename && params.credentials !== "omit") {
        c_func(_http_set_cookie_jar, [http_handle, this.cookie_filename]);
      }
      if (params.proxy) {
        c_func_str(_request_set_proxy, [http_handle, params.proxy]);
      }

      this.start_request(http_handle);
    });
  }

  async fetch(resource, params_old={}) {
    let url = resource;
    //shallow copy the original params object
    let params = Object.fromEntries(Object.entries(params_old));

    if (resource instanceof Request) {
      url = resource.url;
      params.headers = params.headers || Object.fromEntries(resource.headers);
      params.method = params.method || resource.method;
      let resource_body = await resource.arrayBuffer();
      if (resource_body.byteLength !== 0) 
        params.body = resource_body;
    }
    else if (typeof url === "string" || url instanceof String) {
      url = (new URL(url, this.base_url)).href;
    }
    else if (url instanceof URL) {
      url = url.href;
    }
    else {
      url = "" + url;
    }

    if (this.options && this.options.proxy) {
      params.proxy = this.options.proxy;
    }
    check_proxy(params.proxy);

    let redirect_mode = params.redirect;
    let body = await this.constructor.create_options(params);
    params.redirect = "manual";
    if (redirect_mode === "manual")
      return await this.request_async(url, params, body);
    
    for (let i = 0; i < 20; i++) {
      let r = await this.request_async(url, params, body);
      if (r.status !== 201 && (r.status+"")[0] !== "3") 
        return r;
      if (redirect_mode === "error") 
        throw new Error("Too many redirects");
      url = new URL(r.headers.get("location"), url).href;
    }
    throw new Error("Too many redirects");
  }

  static create_response(response_data, response_info) {
    response_info.ok = response_info.status >= 200 && response_info.status < 300;
    response_info.statusText = status_messages[response_info.status] || "";
    if (response_info.status === 204 || response_info.status === 205) {
      response_data = null;
    }
    if (response_info.url.includes("---tls-enabled---")) {
      let url_obj = new URL(response_info.url);
      url_obj.hostname = url_obj.hostname.replace("---tls-enabled---", "");
      url_obj.protocol = "https:";
      if (url_obj.port === "443") url_obj.port = "";
      response_info.url = url_obj.href;
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
    if (params.body instanceof ReadableStream) {
      params.duplex = "half";
    }

    let request_obj = new Request("http://127.0.0.1/", params);
    let array_buffer = await request_obj.arrayBuffer();
    if (array_buffer.byteLength > 0) {
      body = new Uint8Array(array_buffer);
    }
    
    let headers = params.headers || {};
    if (headers instanceof Headers) {
      headers = Object.fromEntries(headers);
    }
    params.headers = new HeadersDict(headers);

    if (params.referrer) {
      params.headers["Referer"] = params.referrer;
    }
    if (!params.headers["User-Agent"]) {
      params.headers["User-Agent"] = navigator.userAgent;
    }
    if (body && !params.headers["Content-Type"]) {
      params.headers["Content-Type"] = request_obj.headers.get("Content-Type") || "";
    }

    return body;
  }
}