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

//convert any data to a uint8array
function any_to_array(data) {
  let data_array;
  if (typeof data === "string") {
    data_array = new TextEncoder().encode(data);
  }
  else if (data instanceof Blob) {
    data.arrayBuffer().then(array_buffer => {
      data_array = new Uint8Array(array_buffer);
      this.send(data_array);
    });
    return;
  }
  //any typedarray
  else if (data instanceof ArrayBuffer) {
    //dataview objects
    if (ArrayBuffer.isView(data) && data instanceof DataView) {
      data_array = new Uint8Array(data.buffer);
    }
    //regular arraybuffers
    else {
      data_array = new Uint8Array(data);
    }
  }
  //regular typed arrays
  else if (ArrayBuffer.isView(data)) {
    data_array = Uint8Array.from(data);
  }
  else {
    throw "invalid data type";
  }

  return data_array;
}