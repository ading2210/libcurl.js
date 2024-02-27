async function test() {
  await libcurl.fetch("https://example.com/");
  for (let i=0; i<20; i++) {
    let r = await libcurl.fetch("https://example.com/");
    assert(r.status === 200, "wrong status");  
  }
}