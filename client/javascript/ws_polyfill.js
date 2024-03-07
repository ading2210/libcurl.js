//class for websocket polyfill

class FakeWebSocket extends EventTarget {
  constructor(url, protocols=[], options={}) {
    super();

    this.url = url;
    this.protocols = protocols;
    this.options = options;
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

    this.socket = null;
    this.connect();
  }

  connect() {
    this.socket = new CurlWebSocket(this.url, this.protocols, this.options);

    this.socket.onopen = () => {
      this.status = this.OPEN;
      let open_event = new Event("open");
      this.onopen(open_event);
      this.dispatchEvent(open_event);
    }

    this.socket.onclose = () => {
      this.status = this.CLOSED;
      let close_event = new CloseEvent("close");
      this.dispatchEvent(close_event);
      this.onclose(close_event);
    };

    this.socket.onerror = (error) => {
      this.status = this.CLOSED;
      let error_event = new Event("error");
      this.dispatchEvent(error_event);
      this.onerror(error_event);
    }

    this.socket.onmessage = (data) => {
      let converted;
      if (typeof data === "string") {
        converted = data;
      }
      else { //binary frame received as uint8array
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
  }

  send(data) {
    let is_text = typeof data === "string";
    if (this.status === this.CONNECTING) {
      throw new DOMException("websocket not ready yet");
    }
    if (this.status === this.CLOSED) {
      return;
    }

    (async () => {
      if (is_text) {
        this.socket.send(data);
      }
      else {
        let data_array = await data_to_array(data);
        this.send(data_array);
      }
    })();
  }

  close() {
    this.status = this.CLOSING;
    this.socket.close();
  }

  get readyState() {
    return this.status;
  }
  get bufferedAmount() {
    return 0;
  }
  get protocol() {
    return this.protocols[0] || "";
  }
  get extensions() {
    return "";
  }
}