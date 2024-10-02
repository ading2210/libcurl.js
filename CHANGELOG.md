# Libcurl.js Changelog:

## v0.6.16 (10/2/24):
- Fix a bug with `Headers` objects and `Request` objects not being properly handled when passed into `libcurl.fetch`
- Errors thrown are now `Error` or `TypeError` objects instead of plain strings

## v0.6.15 (9/6/24):
- WolfSSL has been downgraded to v5.6.6 due to an upstream regression

## v0.6.14 (9/4/24):
- All dependencies have been updated to the latest versions
- `libcurl.load_wasm` now returns a promise that resolves when the WASM has finished loading
- Unused protocol support has been disabled in the curl binary, resulting in 100kb binary size savings

## v0.6.13 (9/1/24):
- A minor bug where the hostname for TCP connections would be wrong in certain cases has been fixed. 

## v0.6.12 (7/28/24):
- The APIs from [wisp-client-js](https://github.com/MercuryWorkshop/wisp-client-js) are now exposed at `libcurl.wisp`

## v0.6.11 (7/18/24):
- Add support for SOCKS5, SOCKS4, and HTTP proxies

## v0.6.10 (7/11/24):
- Fix a problem where the websocket URL wouldn't be set properly in some cases

## v0.6.9 (7/10/24):
- Fix a possible double free when requests get aborted
- Handle `ReadableStream` objects as the request payload
- Support the Clang AddressSanitizer

## v0.6.8 (4/30/24):
- Add support for relative URLs in HTTP sessions
- Better error handling for invalid URLs

## v0.6.7 (3/26/24):
- Fix handling of `Request` objects when passed into `libcurl.fetch`

## v0.6.6 (3/20/24):
- Fix random segfaults due to an improper invocation of libcurl

## v0.6.5 (3/20/24):
- Update Wisp client and server
- Compile WolfSSL with greater site support

## v0.6.4 (3/20/24):
- Fix handling of request bodies

## v0.6.3 (3/20/24):
- Fix an error during websocket cleanup

## v0.6.1 (3/20/24):
- Fix NPM package exports

## v0.6.0 (3/20/24):
- Refactor JS and C code
- Allow for multiple sessions with separate connection pools
- Switch to wolfSSL instead of OpenSSL for significantly smaller binaries
- Add support for sending cookies automatically
- Add NPM export for bundled version

## v0.5.3 (3/11/24):
- Update Wisp client and server, which improves error handling
- Expose the wisp-client-js version in the API

## v0.5.2 (3/10/24):
- Fix a bug with error handling

## v0.5.1 (3/10/24):
- Added support for aborting requests

## v0.5.0 (3/9/24):
- Added support for streaming HTTP responses via a readable stream
- Improve compatibility for older browsers
- Support for all types of fetch request bodies

## v0.4.2 (3/7/24):
- Expose a function to get error strings

## v0.4.1 (3/7/24):
- Fix handling of duplicate HTTP headers

## v0.4.0 (3/7/24):
- Add TLS socket support
- Add function to get the CA cert bundle
- Re-add wsproxy support
- Add custom network transport support
- Split WebSocket API into simple `libcurl.CurlWebSocket` and `libcurl.WebSocket` polyfill
- Refactor WebSocket API code

## v0.3.9 (3/3/24):
- Fix running libcurl.js inside a web worker

## v0.3.8 (2/28/24):
- Update Wisp client and server
- Expose Wisp client API functions

## v0.3.7 (2/27/24):
- Pin C library versions to stable
- Load the CA certs directly from memory instead of from the Emscripten virtual filesystem

## v0.3.6 (2/26/24):
- Fix ES6 module syntax

## v0.3.4 (2/24/24):
- Limit max TCP connections to 50

## v0.3.3 (2/4/24):
- Fix a memory leak with WebSockets

## v0.3.2 (2/4/24):
- Fix handling of 204 and 205 response codes
- Add verbose option to WebSocket API
- Fix conversion of request payloads

## v0.3.1 (2/3/24):
- Add a copyright notice to the JS bundle

## v0.3.0 (2/3/24):
- Add API to get the libcurl.js version and C library versions
- Add checks to ensure that the Websocket proxy URL has been set 

## v0.2.0 (2/2/24):
- Add an option to redirect the verbose curl output.
- Use separate callbacks for stdout and stderr.

## v0.1.2 (2/1/24):
- Fix bundling the WASM into a single file
- Add unit tests

## v0.1.1 (1/29/24):
- Don't set a default websocket proxy URL

## v0.1.0 (1/28/24):
- Initial release on NPM
- Add Github Actions for automatic builds
- Add WebSocket support
- Add Fetch API support 