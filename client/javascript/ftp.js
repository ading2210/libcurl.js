//unfinished!

class FTPSession {
  constructor(url, options={}) {
    if (!url.startsWith("ftp://") || !url.startsWith("ftps://")) {
      throw "invalid url protocol";
    }

    this.url = url;
    this.cwd = new URL(url).pathname;
    this.options = options;
    this.http_handle = null;
  }

  do_request(url) {
    return new Promise((resolve, reject) => {
      let http_handle;
      let data_callback = (data) => {this.data_callback(data)};
      let finish_callback = (error) => {
        _cleanup_handle(http_handle);
        if (error) {
          reject();
        }
        else {
          resolve();
        }
      };
      let headers_callback = () => {this.headers_callback()};

      http_handle = create_handle(url, data_callback, finish_callback, headers_callback);
      _ftp_set_options(http_handle, url, 1);
      start_request(http_handle);
    });
  }

  async download(path) {
    let url = new URL(path, this.url);
    _ftp_set_options(this.http_handle, url, 0);
  }

  cleanup() {

  }
}