async function test() {
  await libcurl.fetch("https://www.example.com/");
  let promises = [];
  for (let i=0; i<10; i++) {
      promises.push((async ()=>{
        let r = await libcurl.fetch("https://www.example.com/");
        await r.text();
      })())
  }
  await Promise.all(promises);
}
