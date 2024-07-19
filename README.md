# libcurl.js

![npm version badge](https://img.shields.io/npm/v/libcurl.js?color=ff5627&style=flat-square)
![npm downloads badge](https://img.shields.io/npm/dm/libcurl.js?color=ff5627&style=flat-square)
![jsdelivr downloads badge](https://data.jsdelivr.com/v1/package/npm/libcurl.js/badge/month)

This is an experimental port of [libcurl](https://curl.se/libcurl/) to WebAssembly for use in the browser. It provides an interface compatible with the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), allowing you to proxy HTTPS requests from the browser with full TLS encryption. Unlike previous implementations, the proxy server cannot read the contents of your requests. 

## Table of Contents:
- [Features](#features)
- [Building](#building)
- [Javascript API](#javascript-api)
  * [Importing the Library](#importing-the-library)
  * [Making HTTP Requests](#making-http-requests)
  * [Creating New HTTP Sessions](#creating-new-http-sessions)
  * [Creating WebSocket Connections](#creating-websocket-connections)
  * [Using TLS Sockets](#using-tls-sockets)
  * [Changing the Network Transport](#changing-the-network-transport)
  * [Changing the Websocket Proxy URL](#changing-the-websocket-proxy-url)
  * [Getting Libcurl's Output](#getting-libcurl-s-output)
  * [Getting Error Strings](#getting-error-strings)
  * [Getting Version Info](#getting-version-info)
  * [Getting the CA Certificates Bundle](#getting-the-ca-certificates-bundle)
- [Proxy Server](#proxy-server)
- [Project Structure](#project-structure)
- [Copyright](#copyright)
  * [Copyright Notice](#copyright-notice)

<small>Table of contents generated with [markdown-toc](http://ecotrust-canada.github.io/markdown-toc/).</small>

## Features:
- Fetch compatible API
- End to end encryption between the browser and the destination server
- Support for up to TLS 1.3
- Support for tunneling HTTP/2 connections 
- Support for proxying WebSockets
- Bypass CORS restrictions without compromising on privacy
- Low latency via multiplexing and reusing open connections
- Use raw TLS sockets in the browser
- Custom network transport support
- Works inside web workers without needing special permissions or headers
- Works in all major browsers (Chromium >= 64, Firefox >= 65, Safari >= 14)
- Has the ability to create multiple independent sessions
- Small footprint size (800kb after compression) and low runtime memory usage
- Support for Brotli and gzip compressed responses

## Building:
You can build this project by running the following commands:
```
git clone https://github.com/ading2210/libcurl.js --recursive
cd libcurl.js/client
./build.sh
```
Make sure you have emscripten, git, and the various C build tools installed. The only OS supported for building libcurl.js is Linux. On Debian-based systems, you can run the following command to install all the dependencies:
```
sudo apt install make cmake emscripten autoconf automake libtool pkg-config wget xxd jq
```

The build script will generate `client/out/libcurl.js` as well as `client/out/libcurl.mjs`, which is an ES6 module. You can supply the following arguments to the build script to control the build:
- `release` - Use all optimizations.
- `single_file` - Include the WASM binary in the outputted JS using base64. 
- `asan` - Use the Clang AddressSanitizer to catch possible memory bugs
- `all` - Build twice, once normally, and once as a single file.

Note: non-release builds will have the `-dev` version suffix and ASan builds will have the `-asan` suffix.

## Javascript API:

### Importing the Library:
To import the library, follow the build instructions in the previous section, and copy `client/out/libcurl.js` and `client/out/libcurl.wasm` to a directory of your choice. After the script is loaded, call `libcurl.load_wasm`, specifying the url of the `libcurl.wasm` file. You do not need to call `libcurl.load_wasm` if you use the `libcurl_full.js` file, as the WASM will be bundled into the JS file.

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

You may also use the `libcurl.onload` callback, which can be useful for running libcurl.js inside a web worker. 
```js
libcurl.onload = () => {
  console.log("libcurl.js ready!");
}
```

Once loaded, there will be a `window.libcurl` object which includes all the API functions. The `libcurl.ready` property can also be used to know if the WASM has loaded. 

There are also ES6 modules available if you are using a bundler. The `libcurl.mjs` and `libcurl_full.mjs` files provide this functionality, with the former being set as the entry point for the NPM package. 
```js
//import the regular version
import { libcurl } from "libcurl.js"; 

//import the version with the wasm included in the js
import { libcurl } from "libcurl.js/bundled"; 
```

Examples of running libcurl.js on the main thread and in a web worker are available at `client/index.html` and `client/worker.html` respectively. 

### Making HTTP Requests:
To perform HTTP requests, use `libcurl.fetch`, which takes the same arguments as the browser's regular `fetch` function. Like the standard Fetch API, `libcurl.fetch` will also return a `Response` object.
```js
let r = await libcurl.fetch("https://ading.dev");
console.log(await r.text());
```

Most of the standard Fetch API's features are supported, with the exception of:
- CORS enforcement
- Caching

Sending cookies is supported, but they will not be automatically sent unless you create a new HTTP session, which is covered in the next section.

The response may contain multiple HTTP headers with the same name, which the `Headers` object isn't able to properly represent. If this matters to you, use `response.raw_headers`, which is an array of key value pairs, instead of `response.headers`. There is support for streaming the response body using a `ReadableStream`, as well as canceling requests using an `AbortSignal`. All requests made using this method share the same connection pool, which has a limit of 50 active TCP connections.

The `proxy` option may be used to specify the URL of a `socks5h`, `socks4a`, or `http` proxy server. For example `proxy: "socks5h://127.0.0.0:1080"` will set the proxy server for just the current request.

### Creating New HTTP Sessions:
To create new sessions for HTTP requests, use the `libcurl.HTTPSession` class. The constructor for this class takes the following arguments:
- `options` - An optional object with various settings.

The valid HTTP session settings are:
- `enable_cookies` - A boolean which indicate whether or not cookies should be persisted within the session.
- `cookie_jar` - A string containing the data in the cookie jar file. This should have been exported from a previous session. For more information on the format for this file, see the [curl documentation](https://curl.se/docs/http-cookies.html).
- `proxy` - A URL for a `socks5h`, `socks4a`, or `http` proxy server. 

Each HTTP session has the following methods available:
- `fetch` - Identical to the `libcurl.fetch` function but only creates connections in this session.
- `set_connections` - Set the connection limits. This takes two arguments, the first being the limit for the connection cache, and the second being the max number of active connections.
- `export_cookies` - Export any cookies which were recorded in the session. This will return an empty string if cookies are disabled or no cookies have been set yet. 
- `close` - Close all connections and clean up the session. You must call this after you are done using the session, otherwise it will leak memory. 

The following attributes are supported:
- `base_url` - Set the base URL used to resolve relative URLs. If this is not defined then an error will be thrown when attempting to fetch a relative URL.

```js
let session = new libcurl.HTTPSession();
session.base_url = "https://ading.dev";
let r = await session.fetch("/projects/");
console.log(await r.text());
session.close();
```

### Creating WebSocket Connections:
To use WebSockets, create a `libcurl.CurlWebSocket` object, which takes the following arguments:
- `url` - The Websocket URL.
- `protocols` - A optional list of websocket subprotocols, as an array of strings.
- `options` - An optional object with extra settings to pass to curl.

The valid WebSocket options are:
- `headers` - HTTP request headers for the websocket handshake.
- `verbose` - A boolean flag that toggles the verbose libcurl output. This verbose output will be passed to the function defined in `libcurl.stderr`, which is `console.warn` by default.
- `proxy` - A URL for a `socks5h`, `socks4a`, or `http` proxy server. 

The following callbacks are available:
- `CurlWebSocket.onopen` - Called when the websocket is successfully connected.
- `CurlWebSocket.onmessage` - Called when a websocket message is received from the server. The data is passed to the first argument of the function, and it will be either a `Uint8Array` or a string, depending on the type of message.
- `CurlWebSocket.onclose` - Called when the websocket is cleanly closed with no error.
- `CurlWebSocket.onerror` - Called when the websocket encounters an unexpected error. The [error code](https://curl.se/libcurl/c/libcurl-errors.html) is passed to the first argument of the function.

The `CurlWebSocket.send` function can be used to send data to the websocket. The only argument is the data that is to be sent, which must be either a string or a `Uint8Array`. 

You can call `CurlWebSocket.close` to close and clean up the websocket.

```js
let ws = new libcurl.CurlWebSocket("wss://echo.websocket.in/", [], {verbose: 1});
ws.onopen = () => {
  console.log("ws connected!");
  ws.send("hello".repeat(100));
};
ws.onmessage = (data) => {
  console.log(data);
};
```

You can also use the `libcurl.WebSocket` object, which works identically to the regular [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) object. It uses the same arguments as the simpler `CurlWebSocket` API.
```js
let ws = new libcurl.WebSocket("wss://echo.websocket.in/");
ws.addEventListener("open", () => {
  console.log("ws connected!");
  ws.send("hello".repeat(128));
});
ws.addEventListener("message", (event) => {
  console.log(event.data);
});
```

### Using TLS Sockets:
Raw TLS sockets can be created with the `libcurl.TLSSocket` class, which takes the following arguments:
- `host` - The hostname to connect to.
- `port` - The TCP port to connect to.
- `options` - An optional object with extra settings to pass to curl.

The valid TLS socket options are:
- `verbose` - A boolean flag that toggles the verbose libcurl output. 
- `proxy` - A URL for a `socks5h`, `socks4a`, or `http` proxy server. 

The callbacks work similarly to the `libcurl.CurlWebSocket` object, with the main difference being that the `onmessage` callback always returns a `Uint8Array`.

The `TLSSocket.send` function can be used to send data to the socket. The only argument is the data that is to be sent, which must be a `Uint8Array`. 

You can use the `TLSSocket.close` function to close the socket.

```js
let socket = new libcurl.TLSSocket("ading.dev", 443, {verbose: 1});
socket.onopen = () => {
  console.log("socket connected!");
  let str = "GET / HTTP/1.1\r\nHost: ading.dev\r\nConnection: close\r\n\r\n";
  socket.send(new TextEncoder().encode(str));
};
socket.onmessage = (data) => {
  console.log(new TextDecoder().decode(data));
};
```

### Changing the Network Transport:
You can change the underlying network transport by setting `libcurl.transport`. The following values are accepted:
- `"wisp"` - Use the [Wisp protocol](https://github.com/MercuryWorkshop/wisp-protocol). This is the default and the fastest option, since it multiplexes several TCP connections on the same websocket.
- `"wsproxy"` - Use the wsproxy protocol, where a new websocket is created for each TCP connection. For example, connecting to `wss://example.com/ading.dev:443` would open a new TCP connection to `ading.dev:443`.
- Any custom class - Use a custom network protocol. If you pass in custom code here, it must be roughly conformant with the standard `WebSocket` API. The URL that is passed into this fake websocket always looks like `"wss://example.com/ws/ading.dev:443"`, where `wss://example.com/ws/` is the proxy server URL, and `ading.dev:443` is the destination server.

### Changing the Websocket Proxy URL:
You can change the URL of the websocket proxy by using `libcurl.set_websocket`.
```js
libcurl.set_websocket("ws://localhost:6001/");
```
If the websocket proxy URL is not set and one of the other API functions is called, an error will be thrown. Note that this URL must end with a trailing slash.

### Getting Libcurl's Output:
If you want more information about a connection, you can pass the `_libcurl_verbose` argument to the `libcurl.fetch` function. These are the same messages that you would see if you ran `curl -v` on the command line.
```js
await libcurl.fetch("https://example.com", {_libcurl_verbose: 1});
```

By default this will print the output to the browser console, but you can set `libcurl.stdout` and `libcurl.stderr` to intercept these messages. This callback will be executed on every line of text that libcurl outputs.
```js
libcurl.stderr = (text) => {document.body.innerHTML += text};
```

Libcurl.js will also output some error messages to the browser console. You can intercept these messages by setting the `libcurl.logger` callback, which takes two arguments:
- `type` - The type of message. This will be one of the following: `"log"`, `"warn"`, `"error"`
- `text` - The text that is to be logged.

This may be useful if you are running libcurl.js inside a web worker and do not have access to the regular console API.

### Getting Error Strings:
Libcurl.js reports errors based on the [error codes](https://curl.se/libcurl/c/libcurl-errors.html) defined by the libcurl C library. The `libcurl.get_error_string` function can be used to get an error string from an error code. 

```js
console.log(libcurl.get_error_string(56));
//"Failure when receiving data from the peer"
```

### Getting Version Info:
You can get version information from the `libcurl.version` object. This object will also contain the versions of all the C libraries that libcurl.js uses. `libcurl.version.lib` returns the version of libcurl.js itself. 

### Getting the CA Certificates Bundle:
You can get the CA cert bundle that libcurl uses by calling `libcurl.get_cacert`. The function will return a string with the certificates in PEM format. The cert bundle comes from the [official curl website](https://curl.se/docs/caextract.html), which is extracted from the Mozilla Firefox source code. 

## Proxy Server:
The proxy server consists of a standard [Wisp](https://github.com/MercuryWorkshop/wisp-protocol) server, allowing multiple TCP connections to share the same websocket.

To host the proxy server, run the following commands:
```
git clone https://github.com/ading2210/libcurl.js --recursive
cd libcurl.js
server/run.sh --static=./client
```

For a full list of server arguments, see the [wisp-server-python documentation](https://github.com/MercuryWorkshop/wisp-server-python).

## Project Structure:
- `client` - Contains all the client-side code.
  - `fragments` - Various patches for the JS that emscripten produces. The script which does the patching can be found at `client/tools/patch_js.py`.
  - `javascript` - All the code for the Javascript API, and for interfacing with the compiled C code.
  - `libcurl` - The C code that interfaces with the libcurl library and gets compiled by emscripten.
  - `tests` - Unit tests and the scripts for running them.
  - `tools` - Helper shell scripts for the build process, and for compiling the various C libraries.
  - `wisp_client` - A submodule for the Wisp client library.
- `server` - Contains all the server-side code for running the websocket proxy server. 
  - `wisp_server` - A submodule for the Python Wisp server.

## Copyright:
This project is licensed under the GNU AGPL v3.

### Copyright Notice:
```
ading2210/libcurl.js - A port of libcurl to WASM for use in the browser.
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