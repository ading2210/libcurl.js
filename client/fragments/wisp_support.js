/* REPLACE
ws ?= ?new WebSocketConstructor\(url, ?opts\)
*/
try {
  let transport;
  if (api.transport === "wisp") {
    transport = new WispWebSocket(url);
  }
  else if (api.transport === "wsproxy") {
    transport = new WebSocket(url);
  }
  else if (typeof api.transport === "string") {
    throw new TypeError("invalid transport type");
  }
  else { //custom transports
    transport = new api.transport(url);
  }
  ws = new tls_shim.ReclaimTLSSocket(url, transport);
}
catch (e) {
  error_msg("Error while creating a TCP connection: " + e);
  throw e;
}
