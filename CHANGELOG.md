# Libcurl.js Changelog:

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

## v0.1.2 (2/1/23):
- Fix bundling the WASM into a single file
- Add unit tests

## v0.1.1 (1/29/23):
- Don't set a default websocket proxy URL

## v0.1.0 (1/28/23):
- Initial release on NPM
- Add Github Actions for automatic builds
- Add WebSocket support
- Add Fetch API support 