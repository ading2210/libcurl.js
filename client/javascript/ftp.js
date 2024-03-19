class FTPSession extends CurlSession {
  constructor(url, options={}) {
    if (!url.startsWith("ftp://") && !url.startsWith("ftps://")) {
      throw "invalid url protocol";
    }
    super(1);

    this.url = url;
    this.options = options;
  }

  send_cmd(cmd) {
    return new Promise((resolve, reject) => {
      let request_ptr;
      let chunks = [];

      let data_callback = () => {};
      let finish_callback = (error) => {
        this.remove_request(request_ptr);
        if (error) {
          reject(`Sending FTP command failed with error ${error}: ${get_error_str(error)}`);
        }
      }
      let headers_callback = (chunk) => {
        chunks.push(chunk);
        console.log(chunk);
      }

      request_ptr = this.create_request(this.url, data_callback, finish_callback, headers_callback);
      c_func(_ftp_set_cmd, [request_ptr, cmd]);
    });
  }

  download(path) {
    let url = new URL(path, this.url).href;
    console.log(url);

    return new Promise((resolve, reject) => {
      let request_ptr;
      let finish_callback = (error) => {
        this.remove_request(request_ptr);
        if (error) {
          reject(`FTP request failed with error ${error}: ${get_error_str(error)}`);
        }
      };
      let headers_callback = (stream) => {
        resolve(stream);
      };

      request_ptr = this.stream_response(url, headers_callback, finish_callback);
      _ftp_set_options(request_ptr);
      this.start_request(request_ptr);
    });
  }
}