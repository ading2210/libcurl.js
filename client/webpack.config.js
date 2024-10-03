module.exports = {
  name: "tls-shim",
  entry: "./tls/index.mjs",
  output: {
    filename: "tls-shim.js",
    library: {
      name: "tls_shim",
      type: "var"
    }
  },
  mode: "development",
  resolve: {
    fallback: {
      crypto: false
    }
  }
}