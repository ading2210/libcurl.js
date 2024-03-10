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

//convert various data types to a uint8array (blobs excluded)
function data_to_array(data) {
  let data_array = null;
  if (typeof data === "string") {
    data_array = new TextEncoder().encode(data);
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

  else {
    throw "invalid data type to be sent";
  }

  return data_array;
}