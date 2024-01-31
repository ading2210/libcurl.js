async function test() {
  let r = await libcurl.fetch("https://example.com/");
  assert(r.status === 200, "wrong status");
}