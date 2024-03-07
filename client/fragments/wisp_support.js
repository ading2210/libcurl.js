/* REPLACE
new WebSocketConstructor
*/
new ((() => {
  if (api.transport === "wisp") {
    return WispWebSocket;
  }
  else if (api.transport === "wsproxy") {
    return WebSocket;
  }
  else { //custom transports
    return api.transport;
  }
})())
