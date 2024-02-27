async function test() {
  await libcurl.fetch("https://www.example.com/");
  let promises = [];
  for (let i=0; i<10; i++) {
      promises.push(libcurl.fetch("https://www.example.com/"))
  }
  await Promise.all(promises);
}
