# libcurl.js

This is an experimental port of [libcurl](https://curl.se/libcurl/) to WebAssembly for use in the browser. It provides an interface compatible with the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), allowing you to proxy HTTPS requests from the browser with full TLS encryption. Unlike previous implementations, the proxy server cannot read the contents of your requests. 

## Features:
- Fetch compatible API
- End to end encryption between the browser and the destination server
- Support for up to TLS 1.3

## Building:
You can build this project by cloning this repo and running the following commands:
```
cd libcurl.js/client
./build.sh
```
Make sure you have emscripten, git, and the various C build tools installed.

## Documentation:

### Javascript API:
This library provides an interface compatible with the standard Fetch API. You can call it using the `libcurl_fetch` function, which works identically to the regular `fetch` function.

### Proxy Server:
The proxy server consists of a SOCKS5 proxy server behind a websocket TCP reverse proxy. Code for running this as a single program is planned. 

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