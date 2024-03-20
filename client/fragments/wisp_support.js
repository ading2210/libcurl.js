/* REPLACE
ws ?= ?new WebSocketConstructor\(url, ?opts\)
*/
try {
  if (api.transport === "wisp") {
    ws = new WispWebSocket(url);
  }
  else if (api.transport === "wsproxy") {
    ws = new WebSocket(url);
  }
  else if (typeof api.transport === "string") {
    throw "invalid transport type";
  }
  else { //custom transports
    ws = new api.transport(url);
  }
}
catch (e) {
  error_msg("Error while creating a TCP connection: " + e);
  throw e;
}
