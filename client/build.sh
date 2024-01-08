#!/bin/bash

set -e

INCLUDE_DIR="build/curl-wasm/include/"
LIB_DIR="build/curl-wasm/lib/"
CACERT_FILE="cacert.pem"
OUT_FILE="out/libcurl.js"

EXPORTED_FUNCS="_load_certs,_perform_request"
RUNTIME_METHODS="addFunction,removeFunction,allocate,ALLOC_NORMAL"
COMPILER_OPTIONS="-o $OUT_FILE -lcurl -lssl -lcrypto -lcjson -I $INCLUDE_DIR -L $LIB_DIR"
EMSCRIPTEN_OPTIONS="-lwebsocket.js -sSINGLE_FILE -sASYNCIFY -sALLOW_TABLE_GROWTH -sEXPORTED_FUNCTIONS=$EXPORTED_FUNCS -sEXPORTED_RUNTIME_METHODS=$RUNTIME_METHODS"

tools/all_deps.sh
tools/generate_cert.sh

rm -rf out
mkdir -p out

COMPILE_CMD="emcc main.c $COMPILER_OPTIONS $EMSCRIPTEN_OPTIONS"
echo $COMPILE_CMD
$COMPILE_CMD

#patch the output to work around some emscripten bugs
sed -i 's/err("__syscall_getsockname " \?+ \?fd);//' $OUT_FILE
sed -i 's/function _emscripten_console_error(str) {/& if(UTF8ToString(str).endsWith("__syscall_setsockopt\\n")) return;/' $OUT_FILE