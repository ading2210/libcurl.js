const wsproxy_base = "wss://anura.pro/";

function allocate_str(str) {
  return allocate(intArrayFromString(str), ALLOC_NORMAL);
}

function websocket_connect(websocket) {
  return new Promise((resolve, reject) => {
    websocket.onopen = () => {resolve()}
    websocket.onerror = () => {reject()}
  })
}

async function main() {

}

window.onload = () => {
  console.log("page loaded, waiting for emscripten module load");
  Module.onRuntimeInitialized = main;
};