async function test() {
  let sessions = [];
  for (let i=0; i<5; i++) {
    sessions.push(new libcurl.HTTPSession());
  }

  let promises = [];
  for (let session of sessions) {
    promises.push((async ()=>{
      let r = await session.fetch("https://www.example.com/");
      await r.text();
    })());
  }
  await Promise.all(promises);

  for (let session of sessions) {
    session.close();
  }
}