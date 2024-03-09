/*
ading2210/libcurl.js - A port of libcurl to WASM for the browser.
Copyright (C) 2023 ading2210

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

//everything is wrapped in a function to prevent emscripten from polluting the global scope
const libcurl = (function() {

//emscripten compiled code is inserted here
/* __emscripten_output__ */

//extra client code goes here
/* __extra_libraries__ */

var websocket_url = null;
var event_loop = null;
var active_requests = 0;
var wasm_ready = false;
var version_dict = null;
var api = null;
const libcurl_version = "__library_version__";

function check_loaded(check_websocket) {
  if (!wasm_ready) {
    throw new Error("wasm not loaded yet, please call libcurl.load_wasm first");
  }
  if (!websocket_url && check_websocket) {
    throw new Error("websocket proxy url not set, please call libcurl.set_websocket");
  }
}

//low level interface with c code
function perform_request(url, params, js_data_callback, js_end_callback, js_headers_callback, body=null) {
  let params_str = JSON.stringify(params);
  let end_callback_ptr;
  let data_callback_ptr;
  let headers_callback_ptr;
  let url_ptr = allocate_str(url);
  let params_ptr = allocate_str(params_str);

  let body_ptr = null;
  let body_length = 0;
  if (body) { //assume body is an int8array
    body_ptr = allocate_array(body);
    body_length = body.length;
  }

  function end_callback(error) {
    Module.removeFunction(end_callback_ptr);
    Module.removeFunction(data_callback_ptr);
    Module.removeFunction(headers_callback_ptr);
    
    active_requests --;
    js_end_callback(error);
  }

  function data_callback(chunk_ptr, chunk_size) {
    let data = Module.HEAPU8.subarray(chunk_ptr, chunk_ptr + chunk_size);
    let chunk = new Uint8Array(data);
    js_data_callback(chunk);
  }

  function headers_callback(response_json_ptr) {
    let response_json = UTF8ToString(response_json_ptr);
    let response_info = JSON.parse(response_json);

    if (body_ptr) _free(body_ptr);
    _free(url_ptr);
    _free(response_json_ptr);

    js_headers_callback(response_info);
  }

  end_callback_ptr = Module.addFunction(end_callback, "vi");
  headers_callback_ptr = Module.addFunction(headers_callback, "vi");
  data_callback_ptr = Module.addFunction(data_callback, "vii");
  let http_handle = _start_request(url_ptr, params_ptr, data_callback_ptr, end_callback_ptr, headers_callback_ptr, body_ptr, body_length);
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


async function create_options(params) {
  let body = null;
  if (params.body) {
    body = await data_to_array(params.body);
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
    let stream_controller;
    let stream = new ReadableStream({
      start(controller) {
        stream_controller = controller;
      }
    });
    
    function data_callback(new_data) {
      stream_controller.enqueue(new_data);
    }
    function headers_callback(response_info) {
      let response_obj = create_response(stream, response_info);
      resolve(response_obj);
    }
    function finish_callback(error) {
      if (error != 0) {
        let error_str = `Request failed with error code ${error}: ${get_error_str(error)}`;
        if (error != 0) error_msg(error_str);
        reject(error_str);
        return;
      }
      stream_controller.close();
    }
    
    perform_request(url, params, data_callback, finish_callback, headers_callback, body);
  });
}

async function libcurl_fetch(url, params={}) {
  check_loaded(true);
  let body = await create_options(params);
  return await perform_request_async(url, params, body);
}

function set_websocket_url(url) {
  websocket_url = url;
  if (Module.websocket) {
    Module.websocket.url = url;
  }
}

function get_version() {
  if (!wasm_ready) return null;
  if (version_dict) return version_dict;

  let version_ptr = _get_version();
  let version_str = UTF8ToString(version_ptr);
  _free(version_ptr);
  version_dict = JSON.parse(version_str);
  version_dict.lib = libcurl_version;
  return version_dict;
}

function get_cacert() {
  return UTF8ToString(_get_cacert());
}

function main() {
  wasm_ready = true;
  _init_curl();
  set_websocket_url(websocket_url);

  if (ENVIRONMENT_IS_WEB) {
    let load_event = new Event("libcurl_load");
    document.dispatchEvent(load_event);
  }
  api.onload();
}

function load_wasm(url) {
  wasmBinaryFile = url;
  createWasm();
  run();
}

Module.onRuntimeInitialized = main;
api = {
  fetch: libcurl_fetch,
  set_websocket: set_websocket_url,
  load_wasm: load_wasm,
  WebSocket: FakeWebSocket,
  CurlWebSocket: CurlWebSocket,
  TLSSocket: TLSSocket,
  get_cacert: get_cacert,
  get_error_string: get_error_str,

  wisp_connections: _wisp_connections,
  WispConnection: WispConnection,
  transport: "wisp",
  
  get copyright() {return copyright_notice},
  get version() {return get_version()},
  get ready() {return wasm_ready},
  get websocket_url() {return websocket_url},

  get stdout() {return out},
  set stdout(callback) {out = callback},
  get stderr() {return err},
  set stderr(callback) {err = callback},
  get logger() {return logger},
  set logger(func) {logger = func},

  onload() {}
};

return api;

})()