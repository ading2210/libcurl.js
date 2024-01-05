const cacert_path = "./out/cacert.pem";
const websocket_url_base = anura.wsproxyURL;

function is_str(obj) {
  return typeof obj === 'string' || obj instanceof String;
}

function allocate_str(str) {
  return allocate(intArrayFromString(str), ALLOC_NORMAL);
}

function allocate_array(array) {
  return allocate(array, ALLOC_NORMAL);
}

//make emscripten shut up about unsupported syscalls
function silence_errs() { 

  window._err = window.err;
  window.err = function() {
    let arg = arguments[0];
    if (is_str(arg) && arg.startsWith("__syscall_getsockname")) {
      return;
    }
    window._err(...arguments);
  }

  window._console_error = window.console.error;
  window.console.error = function() {
    let arg = arguments[0];
    if (is_str(arg) && arg === "warning: unsupported syscall: __syscall_setsockopt\n") {
      return;
    }
    window._console_error(...arguments);
  }
}

//low level interface with c code
function perform_request(url, params, js_data_callback, js_end_callback, body=null) {
  const urlObj = new URL(url);
  let port = urlObj.port;
  if (!port) {
    if (urlObj.protocol === "https:")
      port = 443;
    if (urlObj.protocol === "http:")
      port = 80;
  }
  Module.websocket.url = websocket_url_base + urlObj.host + ':' + port;

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

  let end_callback = (error) => {
    Module.removeFunction(end_callback_ptr);
    Module.removeFunction(data_callback_ptr);
    if (body_ptr) _free(body_ptr);
    _free(url_ptr);
    
    if (error != 0) console.error("request failed with error code " + error);
    js_end_callback(error);
  }

  let data_callback = (chunk_ptr, chunk_size) => {
    let data = Module.HEAPU8.subarray(chunk_ptr, chunk_ptr + chunk_size);
    let chunk = new Uint8Array(data);
    js_data_callback(chunk);
  }

  end_callback_ptr = Module.addFunction(end_callback, "vi");
  data_callback_ptr = Module.addFunction(data_callback, "vii");
  
  _perform_request(url_ptr, params_ptr, data_callback_ptr, end_callback_ptr, body_ptr, body_length);
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

function libcurl_fetch(url, params={}) {
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
  if (params.referer) {
    if (!params.headers) params.headers = {};
    params.headers["Referer"] = params.referer;
  }

  return new Promise((resolve, reject) => {
    let chunks = [];
    let data_callback = (new_data) => {
      chunks.push(new_data);
    };
    let finish_callback = () => {
      let response_data = merge_arrays(chunks);
      // let response_str = new TextDecoder().decode(response_data);
      resolve(new Response(response_data));
    }
    perform_request(url, params, data_callback, finish_callback, body);
  })
}

async function main() {
  silence_errs();
  anura.libcurl_fetch = libcurl_fetch;
  // Module.websocket.url = websocket_url;
  console.log(await libcurl_fetch("https://httpbin.org/anything"));
}

window.onload = () => {
  console.log("page loaded, waiting for emscripten module load");
  Module.onRuntimeInitialized = main;
};