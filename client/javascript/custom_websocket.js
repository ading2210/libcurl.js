//class for custom websocket
//multiple classes attempt to replicate the websocket API
//so this prevents code duplication

class CustomWebSocket extends EventTarget {
  constructor(url, protocols=[]) {
    super();
    
    this.url = url;
    this.protocols = protocols;
    this.binaryType = "blob";

    //legacy event handlers
    this.onopen = () => {};
    this.onerror = () => {};
    this.onmessage = () => {};
    this.onclose = () => {};

    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;

    this.status = this.CONNECTING;
  }

  custom_recv() {}
  recv() {
    let {success, data, is_text} = this.custom_recv();
    if (!success) return;

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

  recv_loop() {
    this.event_loop = setInterval(() => {
      this.recv();
    }, 0);
  }

  close_callback(error) {
    if (this.status == this.CLOSED) return;
    this.status = this.CLOSED;

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

  open_callback() {
    this.status = this.OPEN;
    let open_event = new Event("open");
    this.onopen(open_event);
    this.dispatchEvent(open_event);
  }

  send(data) {
    let is_text = typeof data === "string";
    if (this.status === this.CONNECTING) {
      throw new DOMException("ws not ready yet");
    }
    if (this.status === this.CLOSED) {
      return;
    }

    let data_array = any_to_array(data);
    this.custom_send(data_array, is_text);
  }

  close() {
    this.status = this.CLOSING;
    this.custom_close();
  }

  get readyState() {
    return this.status;
  }
  get bufferedAmount() {
    return 0;
  }
  get protocol() {
    return this.protocols;
  }
  get extensions() {
    return "";
  }
}