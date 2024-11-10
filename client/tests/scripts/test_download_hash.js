//https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#examples
async function digestMessage(msgUint8) {
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return hashHex;
}

async function test() {
  let url = "https://curl.se/download/curl-8.11.0.tar.gz";
  let expected_hash = "264537d90e58d2b09dddc50944baf3c38e7089151c8986715e2aaeaaf2b8118f";

  let r = await libcurl.fetch(url);
  let msg = new Uint8Array(await r.arrayBuffer());
  let hash = await digestMessage(msg);

  assert(hash === expected_hash, "unexpected hash of downloaded data");  
}