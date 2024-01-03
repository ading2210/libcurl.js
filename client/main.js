const cacert_path = "./out/cacert.peem";
const websocket_url = `wss://${location.hostname}/ws`;

function allocate_str(str) {
  return allocate(intArrayFromString(str), ALLOC_NORMAL);
}

//make emscripten shut up about unsupported syscalls
function silence_errs() {
  let is_str = obj => typeof obj === 'string' || obj instanceof String;

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
function perform_request(url, js_data_callback, js_end_callback) {
  let end_callback_ptr;
  let data_callback_ptr;
  let url_ptr = allocate_str(url);

  let end_callback = () => {
    Module.removeFunction(end_callback_ptr);
    Module.removeFunction(data_callback_ptr);
    _free(url_ptr);
    
    js_end_callback();
  }

  let data_callback = (chunk_ptr, chunk_size) => {
    let data = Module.HEAPU8.subarray(chunk_ptr, chunk_ptr + chunk_size);
    let chunk = new Uint8Array(data);
    js_data_callback(chunk);
  }

  end_callback_ptr = Module.addFunction(end_callback, "v");
  data_callback_ptr = Module.addFunction(data_callback, "vii");
  _perform_request(url_ptr, data_callback_ptr, end_callback_ptr);
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

function libcurl_fetch(url) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let data_callback = (new_data) => {
      chunks.push(new_data);
    };
    let finish_callback = () => {
      let response_data = merge_arrays(chunks);
      let response_str = new TextDecoder().decode(response_data);
      resolve(response_str);
    }
    perform_request(url, data_callback, finish_callback);  
  })
}

async function main() {
  silence_errs();
  console.log(await libcurl_fetch("https://ifconfig.me/all"));
}

window.onload = () => {
  console.log("page loaded, waiting for emscripten module load");
  //Module.websocket.url = websocket_url;
  Module.onRuntimeInitialized = main;
};