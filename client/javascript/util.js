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

function allocate_str(str) {
  return allocate(intArrayFromString(str), ALLOC_NORMAL);
}

function allocate_array(array) {
  return allocate(array, ALLOC_NORMAL);
}

function get_error_str(error_code) {
  let error_ptr = _get_error_str(error_code);
  return UTF8ToString(error_ptr);
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

//convert various data types to a uint8array (blobs excluded)
function data_to_array(data) {
  //data already in correct type
  if (data instanceof Uint8Array) {
    return data;  
  }

  else if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }

  else if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  //dataview objects or any other typedarray
  else if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer);
  }

  throw new TypeError("invalid data type to be sent");
}

//c function wrapper
function c_func(target, args=[]) {
  let str_pointers = [];
  for (let i = 0; i < args.length; i++) {
    let ptr = null;
    if (typeof args[i] === "string") {
      ptr = allocate_str(args[i]);
    }
    if (args[i] instanceof Uint8Array) {
      ptr = allocate_array(args[i]);
    }

    if (!ptr) continue;
    args[i] = ptr;
    str_pointers.push(ptr);
  }

  let ret = target(...args);
  for (let ptr of str_pointers) {
    _free(ptr);
  }

  return ret;
}

//additional wrapper to free any returned strings
function c_func_str(target, args=[]) {
  let ptr = c_func(target, args);
  let str = UTF8ToString(ptr);
  _free(ptr);
  return str;
}

//ensure that the proxy url has a valid protocol
function check_proxy(proxy) {
  if (typeof proxy === "string" || proxy instanceof String) {
    let protocol = new URL(proxy).protocol;
    if (!["socks5h:", "socks4a:", "http:"].includes(protocol)) {
      throw new TypeError("Only socks5h, socks4a, and http proxies are supported.");
    }
  }
}