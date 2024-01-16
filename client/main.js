//everything is wrapped in a function to prevent emscripten from polluting the global scope
window.libcurl = (function() {

//emscripten compiled code is inserted here
/* __emscripten_output__ */

//wisp client code goes here
/* __wisp_libraries__ */

const websocket_url = `wss://${location.hostname}/ws/`;

const status_messages = {
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  103: "Early Hints",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  306: "Switch Proxy",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Content",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required"
}

//a case insensitive dictionary for request headers
class Headers {
  constructor(obj) {
    for (let key in obj) {
      this[key] = obj[key];
    }
    return new Proxy(this, this);
  }
  get(target, prop) {
    let keys = Object.keys(this);
    for (let key of keys) {
      if (key.toLowerCase() === prop.toLowerCase()) {
        return this[key];
      }
    }
  }
  set(target, prop, value) {
    let keys = Object.keys(this);
    for (let key of keys) {
      if (key.toLowerCase() === prop.toLowerCase()) {
        this[key] = value;
      }
    }
    this[prop] = value;
    return true;
  }
}

function is_str(obj) {
  return typeof obj === 'string' || obj instanceof String;
}

function allocate_str(str) {
  return allocate(intArrayFromString(str), ALLOC_NORMAL);
}

function allocate_array(array) {
  return allocate(array, ALLOC_NORMAL);
}

//low level interface with c code
function perform_request(url, params, js_data_callback, js_end_callback, body=null) {
  let params_str = JSON.stringify(params);
  let end_callback_ptr;
  let data_callback_ptr;
  let url_ptr = allocate_str(url);
  let params_ptr = allocate_str(params_str);

  let body_ptr = null;
  let body_length = 0;
  if (body) { //assume body is an int8array
    body_ptr = allocate_array(body);
    body_length = body.length;
  }

  let end_callback = (error, response_json_ptr) => {
    let response_json = UTF8ToString(response_json_ptr);
    let response_info = JSON.parse(response_json);

    Module.removeFunction(end_callback_ptr);
    Module.removeFunction(data_callback_ptr);
    if (body_ptr) _free(body_ptr);
    _free(url_ptr);
    _free(response_json_ptr);
    
    if (error != 0) console.error("request failed with error code " + error);
    js_end_callback(error, response_info);
  }

  let data_callback = (chunk_ptr, chunk_size) => {
    let data = Module.HEAPU8.subarray(chunk_ptr, chunk_ptr + chunk_size);
    let chunk = new Uint8Array(data);
    js_data_callback(chunk);
  }

  end_callback_ptr = Module.addFunction(end_callback, "vii");
  data_callback_ptr = Module.addFunction(data_callback, "vii");
  _start_request(url_ptr, params_ptr, data_callback_ptr, end_callback_ptr, body_ptr, body_length);
  _free(params_ptr);
}

function merge_arrays(arrays) {
  let total_len = arrays.reduce((acc, val) => acc + val.length, 0);
  let new_array = new Uint8Array(total_len);
  let offset = 0;
  for (let array of arrays) {
    new_array.set(array, offset);
    offset += array.length;
  }
  return new_array;
}

function create_response(response_data, response_info) {
  response_info.ok = response_info.status >= 200 && response_info.status < 300;
  response_info.statusText = status_messages[response_info.status] || "";

  let response_obj = new Response(response_data, response_info);
  for (let key in response_info) {
    Object.defineProperty(response_obj, key, {
      writable: false,
      value: response_info[key]
    });
  }
  return response_obj;
}

function create_options(params) {
  let body = null;
  if (params.body) {
    if (is_str(params.body)) {
      body = new TextEncoder().encode(params.body);
    }
    else {
      body = Uint8Array.from(params);
    }
    params.body = true;
  }

  if (!params.headers) params.headers = {};
  params.headers = new Headers(params.headers);

  if (params.referer) {
    params.headers["Referer"] = params.referer;
  }
  if (!params.headers["User-Agent"]) {
    params.headers["User-Agent"] = navigator.userAgent;
  }

  return body;
}

function libcurl_fetch(url, params={}) {
  let body = create_options(params);

  return new Promise((resolve, reject) => {
    let chunks = [];
    let data_callback = (new_data) => {
      chunks.push(new_data);
    };
    
    let finish_callback = (error, response_info) => {
      if (error != 0) {
        reject("libcurl.js encountered an error: " + error);
        return;
      }
      let response_data = merge_arrays(chunks);
      let response_obj = create_response(response_data, response_info);
      resolve(response_obj);
    }
    perform_request(url, params, data_callback, finish_callback, body);
  })
}

function set_websocket_url(url) {
  Module.websocket.url = url;
}

function main() {
  console.log("emscripten module loaded");
  _init_curl();
  set_websocket_url(websocket_url);

  let load_event = new Event("libcurl_load");
  document.dispatchEvent(load_event);
}

Module.onRuntimeInitialized = main;
return {
  fetch: libcurl_fetch,
  set_websocket: set_websocket_url,
}

})()