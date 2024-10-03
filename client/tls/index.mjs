import { makeTLSClient } from '@reclaimprotocol/tls'

export class ReclaimTLSSocket extends EventTarget {
  constructor(url, socket) {
    //set up websocket interface
    super();
    this.url = url;
    this.socket = socket;
    this.protocols = [];
    this.binaryType = "blob";

    this.onopen = () => {};
    this.onerror = () => {};
    this.onmessage = () => {};
    this.onclose = () => {};

    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;

    //parse host and port
    let url_split = this.url.split("/");
    let wsproxy_path = url_split.pop().split(":");
    this.host = wsproxy_path[0];
    this.port = parseInt(wsproxy_path[1]);

    //create tls client
    this.tls = makeTLSClient({
      host: this.host,
      verifyServerCertificate: true,

      write: async ({header, content}) => {
        var message = new Uint8Array(header.length + content.length);
        message.set(header);
        message.set(content, header.length);
        this.socket.send(message);
      },
      onHandshake: () => {
        this.status = this.OPEN;
        this.emit_event(new Event("open"));
      },
      onApplicationData: (data) => {
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
            throw new TypeError("invalid binaryType string");
          }
        }

        this.emit_event(new MessageEvent("message", {data: converted}));
      },
      onTlsEnd: () => {
        this.status = this.CLOSED;
        this.emit_event(new CloseEvent("close"));
        this.socket.close();
      }
    })

    //set up socket callbacks
    this.socket.binaryType = "arraybuffer";
    this.socket.onopen = () => {
      this.tls.startHandshake();
    }
    this.socket.onmessage = (event) => {
      this.tls.handleReceivedBytes(new Uint8Array(event.data));
    }
    this.socket.onclose = () => {
      if (this.tls.hasEnded) return;
      this.tls.end();
    }
    this.socket.onerror = () => {
      this.status = this.CLOSED;
      this.emit_event(new Event("error"));
    }
    this.status = this.CONNECTING;
  }

  send(data) {
    if (this.status === this.CONNECTING) {
      throw new DOMException("websocket not ready yet");
    }
    if (this.status === this.CLOSED) {
      return;
    }

    if (data instanceof Blob) {
      (async () => {
        let array_buffer = await data.arrayBuffer();
        this.send(new Uint8Array(array_buffer));
      })();
      return;
    }
    this.tls.write(data_to_array(data));
  }

  emit_event(event) {
    this.dispatchEvent(event);
    if (typeof this["on" + event.type] === "function")
      this["on" + event.type](event);
  }

  close() {
    this.status = this.CLOSING;
    this.tls.end();
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