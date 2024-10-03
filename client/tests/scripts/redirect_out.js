async function test() {
  let output = [];
  function out_callback(text) {
    output.push(text);
  }
  libcurl.stdout = out_callback;
  libcurl.stderr = out_callback;
  await libcurl.fetch("https://example.com/", {_libcurl_verbose: 1});
  console.log(output);
  assert(output[0].includes("* Host example.com"), "unexpected output in stderr");
}