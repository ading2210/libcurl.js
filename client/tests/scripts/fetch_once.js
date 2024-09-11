async function test() {
  //regular fetch
  let r = await libcurl.fetch("https://example.com/");
  assert(r.status === 200, "wrong status");
  await r.text();

  //fetch with request object
  let options = {headers: new Headers({"x-test-header": "1"})};
  let r2 = await libcurl.fetch(new Request("https://httpbin.org/get", options));
  assert(r2.status === 200, "wrong status");
  let r2_json = await r2.json();
  assert(r2_json.headers["X-Test-Header"] === "1");
}