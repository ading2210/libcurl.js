# libcurl.js

This is an experimental port of [libcurl](https://curl.se/libcurl/) to WebAssembly for use in the browser. It provides an interface compatible with the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), allowing you to proxy HTTPS requests from the browser with full TLS encryption. Unlike previous implementations, the proxy server cannot read the contents of your requests. 

## Features:
- Fetch compatible API
- End to end encryption between the browser and the destination server
- Support for up to TLS 1.3

## Building:
You can build this project by running the following commands:
```
git clone https://github.com/ading2210/libcurl.js
cd libcurl.js/client
./build.sh
```
Make sure you have emscripten, git, and the various C build tools installed. The build script will generate `client/out/libcurl.js` as well as `client/out/libcurl_module.mjs`, which is an ES6 module.

## Javascript API:

### Importing the Library:
To import the library, follow the build instructions in the previous section, and copy `client/out/libcurl.js` a directory of your choice. Then you can simply link to it using a script tag and you will be able to use libcurl.js in your projects. Deferring the script load is recommended because the JS file is too large to download immediately.

```html
<script defer src="./out/libcurl.js"></script>
```

To know when libcurl.js has finished loading, you can use the `libcurl_load` DOM event. 
```js
document.addEventListener("libcurl_load", ()=>{
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

### Changing the Websocket URL:
You can change the URL of the websocket proxy by using `libcurl.set_websocket`.
```js
libcurl.set_websocket("ws://localhost:6001/");
```

## Proxy Server:
The proxy server consists of a [SOCKS5 proxy server](https://github.com/Amaindex/asyncio-socks-server) behind a [websocket TCP proxy](https://github.com/novnc/websockify). 

To host the proxy server, run the following commands:
```
git clone https://github.com/ading2210/libcurl.js
cd libcurl.js/server
./run.sh
```

You can use the `PORT` and `SOCKS5_PORT` environment variables to control which ports the websocket proxy and the SOCKS5 server run on.

## Copyright:
This project is licensed under the GNU AGPL v3.

### Copyright Notice:
```
ading2210/libcurl.js - A port of libcurl to WASM
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