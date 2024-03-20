async function test() {
  let payload = "hello".repeat(100);
  let r = await libcurl.fetch("https://httpbin.org/anything", {
    method: "POST",
    body: new Blob([payload], {type: "text/plain"})
  });
  assert(r.status === 200, "wrong status");
  let json = await r.json();
  assert(json.data === payload, "server reports wrong payload");
}