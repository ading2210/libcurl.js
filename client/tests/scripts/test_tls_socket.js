function test() {
  return new Promise((resolve, reject) => {
    let socket = new libcurl.TLSSocket("cloudflare.com", 443, {verbose: 1});

    socket.onopen = () => {
      let str = "GET /cdn-cgi/trace HTTP/1.1\r\nHost: cloudflare.com\r\nConnection: close\r\n\r\n";
      socket.send(new TextEncoder().encode(str));
    };

    socket.onmessage = (data) => {
      let text = new TextDecoder().decode(data);
      if (!text.includes("tls=TLSv1.3")) {
        reject("cloudflare reported tls version mismatch"); 
        return;
      }
      if (!text.includes("HTTP/1.1 200 OK")) {
        reject("cloudflare reported http error"); 
        return;
      }
      resolve();
    };

    socket.onerror = (error) => {
      reject("socket error occurred " + error);
    }
  });
}