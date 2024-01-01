#!/bin/bash

if [ ! -f cacert.pem ]; then
  wget "https://curl.se/ca/cacert.pem"
fi
emcc main.c -lcurl -lssl -lcrypto -I curl-wasm/include/ -L curl-wasm/lib/ -lwebsocket.js -sWEBSOCKET_URL=wss://debug.ading.dev/ws -pthread -sPROXY_TO_PTHREAD --preload-file cacert.pem -Os