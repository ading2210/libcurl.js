function test() {
  let message_len = 1024;

  return new Promise((resolve, reject) => {
    let ws = new libcurl.WebSocket("wss://echo.websocket.org/");
    ws.addEventListener("open", () => {
      ws.send("hello".repeat(message_len));
    });
    
    let messages = 0;
    ws.addEventListener("message", (event) => {
      messages += 1;
      if (messages >= 2) {
        if (event.data !== "hello".repeat(message_len)) reject("unexpected response");
        else if (messages >= 11) resolve();
        else ws.send("hello".repeat(message_len));
      }
    });

    ws.addEventListener("error", () => {
      reject("ws error occurred");
    });
  })
}