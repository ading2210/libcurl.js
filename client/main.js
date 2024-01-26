//everything is wrapped in a function to prevent emscripten from polluting the global scope
window.libcurl = (function() {

//emscripten compiled code is inserted here
/* __emscripten_output__ */

//extra client code goes here
/* __extra_libraries__ */

var websocket_url = `wss://${location.hostname}/ws/`;
var event_loop = null;
var active_requests = 0;
var wasm_ready = false;

function check_loaded() {
  if (!wasm_ready) {
    throw new Error("wasm not loaded yet, please call libcurl.load_wasm first");
  }
}

//a case insensitive dictionary for request headers
class HeadersDict {
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
    active_requests --;
    js_end_callback(error, response_info);
  }

  let data_callback = (chunk_ptr, chunk_size) => {
    let data = Module.HEAPU8.subarray(chunk_ptr, chunk_ptr + chunk_size);
    let chunk = new Uint8Array(data);
    js_data_callback(chunk);
  }

  end_callback_ptr = Module.addFunction(end_callback, "vii");
  data_callback_ptr = Module.addFunction(data_callback, "vii");
  let http_handle = _start_request(url_ptr, params_ptr, data_callback_ptr, end_callback_ptr, body_ptr, body_length);
  _free(params_ptr);
  
  active_requests ++;
  _tick_request();
  if (!event_loop) {
    event_loop = setInterval(() => {
      if (_active_requests() || active_requests) {
        _tick_request();
      }
      else {
        clearInterval(event_loop);
        event_loop = null;
      }
    }, 0);
  }

  return http_handle;
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
  for (let header_name in response_info.headers) {
    let header_value = response_info.headers[header_name];
    response_obj.headers.append(header_name, header_value);
  }
  
  return response_obj;
}

async function parse_body(data) {
  let data_array = null;
  if (typeof data === "string") {
    data_array = new TextEncoder().encode(data);
  }

  else if (data instanceof Blob) {
    let array_buffer = await data.arrayBuffer();
    data_array = new Uint8Array(array_buffer);
  }

  //any typedarray
  else if (data instanceof ArrayBuffer) {
    //dataview objects
    if (ArrayBuffer.isView(data) && data instanceof DataView) {
      data_array = new Uint8Array(data.buffer);
    }
    //regular typed arrays
    else if (ArrayBuffer.isView(data)) {
      data_array = Uint8Array.from(data);
    }
    //regular arraybuffers
    else {
      data_array = new Uint8Array(data);
    }
  }

  else if (data instanceof ReadableStream) {
    let chunks = [];
    for await (let chunk of data) {
      chunks.push(chunk);
    }
    data_array = merge_arrays(chunks);
  }

  else {
    throw "invalid data type to be sent";
  }
  return data_array;
}

async function create_options(params) {
  let body = null;
  if (params.body) {
    body = await parse_body(params.body);
    params.body = true;
  }

  if (!params.headers) params.headers = {};
  params.headers = new HeadersDict(params.headers);

  if (params.referer) {
    params.headers["Referer"] = params.referer;
  }
  if (!params.headers["User-Agent"]) {
    params.headers["User-Agent"] = navigator.userAgent;
  }

  return body;
}

//wrap perform_request in a promise
function perform_request_async(url, params, body) {
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
  });
}

async function libcurl_fetch(url, params={}) {
  check_loaded();
  let body = await create_options(params);
  return await perform_request_async(url, params, body);
}

function set_websocket_url(url) {
  check_loaded();
  if (!Module.websocket) {
    document.addEventListener("libcurl_load", () => {
      set_websocket_url(url);
    });
  }
  else Module.websocket.url = url;
}

function main() {
  console.log("emscripten module loaded");
  wasm_ready = true;
  _init_curl();
  set_websocket_url(websocket_url);

  let load_event = new Event("libcurl_load");
  document.dispatchEvent(load_event);
}

function load_wasm(url) {
  wasmBinaryFile = url;
  createWasm();
  run();
}

Module.onRuntimeInitialized = main;
return {
  fetch: libcurl_fetch,
  set_websocket: set_websocket_url,
  load_wasm: load_wasm,
  wisp: _wisp_connections,
  WebSocket: CurlWebSocket
}

})()