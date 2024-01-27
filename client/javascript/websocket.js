//class for custom websocket

class CurlWebSocket extends EventTarget {
  constructor(url, protocols=[]) {
    super();
    if (!url.startsWith("wss://") && !url.startsWith("ws://")) {
      throw new SyntaxError("invalid url");
    }

    this.url = url;
    this.protocols = protocols;
    this.binaryType = "blob";
    this.recv_buffer = [];

    //legacy event handlers
    this.onopen = () => {};
    this.onerror = () => {};
    this.onmessage = () => {};
    this.onclose = () => {};

    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;

    this.connect();
  }

  connect() {
    this.status = this.CONNECTING;
    let data_callback = () => {};
    let finish_callback = (error, response_info) => {
      this.finish_callback(error, response_info);
    }
    this.http_handle = perform_request(this.url, {}, data_callback, finish_callback, null);
    this.recv_loop();
  }

  recv() {
    let buffer_size = 64*1024;
    let result_ptr = _recv_from_websocket(this.http_handle, buffer_size);
    let result_code = _get_result_code(result_ptr);

    if (result_code == 0) { //CURLE_OK - data recieved 
      if (_get_result_closed(result_ptr)) {
        //this.pass_buffer();
        this.close_callback();
        return;
      }

      let data_size = _get_result_size(result_ptr);
      let data_ptr = _get_result_buffer(result_ptr);
      let data_heap = Module.HEAPU8.subarray(data_ptr, data_ptr + data_size);
      let data = new Uint8Array(data_heap);
      _free(data_ptr);
      
      this.recv_buffer.push(data);
      if (data_size !== buffer_size && !_get_result_bytes_left(result_ptr)) { //message finished
        let full_data = merge_arrays(this.recv_buffer);
        let is_text = _get_result_is_text(result_ptr)
        this.recv_buffer = [];
        this.recv_callback(full_data, is_text);
      }
    }

    if (result_code == 52) { //CURLE_GOT_NOTHING - socket closed
      this.close_callback();
    }

    _free(result_ptr);
  }

  recv_loop() {
    this.event_loop = setInterval(() => {
      this.recv();
    }, 1);
  }

  recv_callback(data, is_text=false) {
    let converted;
    if (is_text) {
      converted = new TextDecoder().decode(data);
    }
    else {
      if (this.binaryType == "blob") {
        converted = new Blob(data);
      }
      else if (this.binaryType == "arraybuffer") {
        converted = data.buffer;
      }
      else {
        throw "invalid binaryType string";
      }  
    }

    let msg_event = new MessageEvent("message", {data: converted});
    this.onmessage(msg_event);
    this.dispatchEvent(msg_event);
  }

  close_callback(error=false) {
    if (this.status == this.CLOSED) return;
    this.status = this.CLOSED;

    clearInterval(this.event_loop);
    _cleanup_websocket();

    if (error) {
      let error_event = new Event("error");
      this.dispatchEvent(error_event);
      this.onerror(error_event);
    }
    else {
      let close_event = new CloseEvent("close");
      this.dispatchEvent(close_event);
      this.onclose(close_event);
    }
  }

  finish_callback(error, response_info) {
    this.status = this.OPEN;
    if (error != 0) this.close_callback(true);
    let open_event = new Event("open");
    this.onopen(open_event);
    this.dispatchEvent(open_event);
  }

  send(data) {
    let is_text = false;
    if (this.status === this.CONNECTING) {
      throw new DOMException("ws not ready yet");
    }
    if (this.status === this.CLOSED) {
      return;
    }
    
    let data_array;
    if (typeof data === "string") {
      data_array = new TextEncoder().encode(data);
      is_text = true;
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

    let data_ptr = allocate_array(data_array);
    let data_len = data.length;
    _send_to_websocket(this.http_handle, data_ptr, data_len, is_text);
    _free(data_ptr);
  }

  close() {
    _close_websocket(this.http_handle);
  }

  get readyState() {
    return this.status;
  }
  get bufferedAmount() {
    return 0;
  }
  get protocol() {
    return "";
  }
  get extensions() {
    return "";
  }
}