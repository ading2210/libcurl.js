function from_id(id) {
  return document.getElementById(id);
}

async function start_request() {
  let request_output = from_id("request_info");
  let libcurl_output = from_id("libcurl_output");
  let network_data = from_id("network_data");
  let url_box = from_id("url");

  request_output.innerText = "";
  libcurl_output.innerText = "";
  network_data.innerText = "";
  
  let url = url_box.value;
  if (!url.startsWith("http://") && !url.startsWith("https://")) 
    url = "https://" + url;
  request_output.innerText += `GET ${url}\n\n`;

  try {
    let r = await libcurl.fetch(url, {_libcurl_verbose: 1});
    request_output.innerText += await r.text();
  }
  catch (e) {
    request_output.innerText += e;
  }
}

function handle_output(text) {
  let output_element = from_id("libcurl_output");
  output_element.innerText += text + "\n";
  output_element.scrollTop = output_element.scrollHeight;
}

function handle_ws_traffic(data, direction) {
  let network_data = from_id("network_data");
  let table_row = document.createElement("tr");
  let direction_cell = document.createElement("td");
  let data_cell = document.createElement("td");
  let data_pre = document.createElement("pre");

  if (direction === "send") 
    direction_cell.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
  else if (direction === "recv")
    direction_cell.style.backgroundColor = "rgba(0, 255, 0, 0.3)";
  direction_cell.style.fontFamily = "monospace";
  direction_cell.style.width = "36px";
  data_pre.style.fontSize = "10px";
  network_data.parentNode.style.display = "block";
  network_data.parentNode.style.marginBottom = "-2px";

  data_cell.append(data_pre);
  table_row.append(direction_cell, data_cell);

  direction_cell.innerText = direction;
  data_pre.innerText = String.fromCodePoint(...new Uint8Array(data));
  network_data.append(table_row);
}

function proxy_websocket() {
  WebSocket.prototype.send = new Proxy(WebSocket.prototype.send, {
    apply(a, b, c) {
      handle_ws_traffic(c[0], "send");
      Reflect.apply(a, b, c);
    }}
  );
  WebSocket = new Proxy(WebSocket, {
    construct(target, args) {
      let ws = new target(...args);
      ws.addEventListener("message", (event) => {
        handle_ws_traffic(event.data, "recv");
      }); 
      return ws;
    }}
  );
}

document.addEventListener("libcurl_load", () => {
  console.log(`loaded libcurl.js ${libcurl.version.lib}`);

  libcurl.set_websocket("wss://wisp.mercurywork.shop/");
  libcurl.stdout = handle_output;
  libcurl.stderr = handle_output;
  proxy_websocket();

  from_id("status_text").style.display = "none";
  from_id("main_table").style.visibility = "visible";
  start_request();
});