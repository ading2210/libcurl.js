# libcurl.js

This is an experimental port of [libcurl](https://curl.se/libcurl/) to WebAssembly for use in the browser. It provides an interface compatible with the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), allowing you to proxy HTTPS requests from the browser with full TLS encryption. Unlike previous implementations, the proxy server cannot read the contents of your requests. 

## Features:
- Fetch compatible API
- End to end encryption between the browser and the destination server
- Support for up to TLS 1.3
- Support for tunneling HTTP/2 connections 
- Support for proxying WebSockets
- Bypass CORS restrictions
- Low latency via multiplexing and reusing open connections

## Building:
You can build this project by running the following commands:
```
git clone https://github.com/ading2210/libcurl.js --recursive
cd libcurl.js/client
./build.sh
```
Make sure you have emscripten, git, and the various C build tools installed. The only OS supported for building libcurl.js is Linux. On Debian-based systems, you can run the following command to install all the dependencies:
```
sudo apt install make cmake emscripten autoconf automake libtool pkg-config wget xxd
```

The build script will generate `client/out/libcurl.js` as well as `client/out/libcurl.mjs`, which is an ES6 module. You can supply the following arguments to the build script to control the build:
- `release` - Use all optimizations.
- `single_file` - Include the WASM binary in the outputted JS using base64. 
- `all` - Build twice, once normally, and once as a single file.

## Javascript API:

### Importing the Library:
To import the library, follow the build instructions in the previous section, and copy `client/out/libcurl.js` and `client/out/libcurl.wasm` to a directory of your choice. After the script is loaded, call `libcurl.load_wasm`, specifying the url of the `libcurl.wasm` file.

```html
<script defer src="./out/libcurl.js" onload="libcurl.load_wasm('/out/libcurl.wasm');"></script>
```

Alternatively, prebuilt versions can be found on NPM and jsDelivr. You can use the following URLs to load libcurl.js from a third party CDN.
```
https://cdn.jsdelivr.net/npm/libcurl.js@latest/libcurl.js
https://cdn.jsdelivr.net/npm/libcurl.js@latest/libcurl.wasm
```

To know when libcurl.js has finished loading, you can use the `libcurl_load` DOM event. 
```js
document.addEventListener("libcurl_load", ()=>{
  libcurl.set_websocket(`wss://${location.hostname}/ws/`);
  console.log("libcurl.js ready!");
});
```

Once loaded, there will be a `window.libcurl` object which includes all the API functions.

### Making HTTP Requests:
To perform HTTP requests, use `libcurl.fetch`, which takes the same arguments as the browser's regular `fetch` function. Like the standard Fetch API, `libcurl.fetch` will also return a `Response` object.
```js
let r = await libcurl.fetch("https://ading.dev");
console.log(await r.text());
```

Most of the standard Fetch API's features are supported, with the exception of:
- CORS enforcement
- `FormData` or `URLSearchParams` as the request body
- Sending credentials/cookies automatically
- Caching

### Creating WebSocket Connections:
To use WebSockets, create a `libcurl.WebSocket` object, which works identically to the regular [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) object.
```js
let ws = new libcurl.WebSocket("wss://echo.websocket.org");
ws.addEventListener("open", () => {
  console.log("ws connected!");
  ws.send("hello".repeat(128));
});
ws.addEventListener("message", (event) => {
  console.log(event.data);
});
```

### Changing the Websocket URL:
You can change the URL of the websocket proxy by using `libcurl.set_websocket`.
```js
libcurl.set_websocket("ws://localhost:6001/");
```
If the websocket proxy URL is not set and one of the other API functions is called, an error will be thrown. Note that this URL must end with a trailing slash.

### Getting Libcurl's Output:
If you want more information about a connection, you can pass the `_libcurl_verbose` argument to the `libcurl.fetch` function.
```js
await libcurl.fetch("https://example.com", {_libcurl_verbose: 1});
```
By default this will print the output to the browser console, but you can set `libcurl.stdout` and `libcurl.stderr` to intercept these messages. This callback will be executed on every line of text that libcurl outputs.
```js
libcurl.stderr = (text) => {document.body.innerHTML += text};
```

## Proxy Server:
The proxy server consists of a standard [Wisp](https://github.com/MercuryWorkshop/wisp-protocol) server, allowing multiple TCP connections to share the same websocket.

To host the proxy server, run the following commands:
```
git clone https://github.com/ading2210/libcurl.js --recursive
cd libcurl.js
server/run.sh --static=./client
```

You can use the `HOST` and `PORT` environment variables to control the hostname and port that the proxy server listens on.

## Copyright:
This project is licensed under the GNU AGPL v3.

### Copyright Notice:
```
ading2210/libcurl.js - A port of libcurl to WASM for the browser.
Copyright (C) 2023 ading2210

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```