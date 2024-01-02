const cacert_path = "./out/cacert.peem";
const websocket_url = `wss://${location.hostname}/ws`;

function allocate_str(str) {
  return allocate(intArrayFromString(str), ALLOC_NORMAL);
}

async function main() {

}

window.onload = () => {
  console.log("page loaded, waiting for emscripten module load");
  //Module.websocket.url = websocket_url;
  Module.onRuntimeInitialized = main;
};