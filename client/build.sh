#!/bin/bash

INCLUDE_DIR="build/curl-wasm/include/"
LIB_DIR="build/curl-wasm/lib/"
CACERT_FILE="cacert.pem"
OUT_FILE="out/libcurl.js"

EXPORTED_FUNCS="_main"
COMPILER_OPTIONS="-o $OUT_FILE -Os -lcurl -lssl -lcrypto -I $INCLUDE_DIR -L $LIB_DIR"
EMSCRIPTEN_OPTIONS="-lwebsocket.js -sWEBSOCKET_URL=wss://debug.ading.dev/ws -pthread -sPROXY_TO_PTHREAD -sEXPORTED_FUNCTIONS=$EXPORTED_FUNCS --preload-file $CACERT_FILE"

if [ ! -f $CACERT_FILE ]; then
  wget "https://curl.se/ca/cacert.pem" -O $CACERT_FILE
fi

COMPILE_CMD="emcc main.c $COMPILER_OPTIONS $EMSCRIPTEN_OPTIONS"
echo $COMPILE_CMD
$COMPILE_CMD
mv out/libcurl.data ./