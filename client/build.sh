#!/bin/bash

set -e

INCLUDE_DIR="build/curl-wasm/include/"
LIB_DIR="build/curl-wasm/lib/"
OUT_FILE="out/libcurl.js"
ES6_FILE="out/libcurl_module.mjs"
MODULE_FILE="out/emscripten_compiled.js"
WRAPPER_SOURCE="main.js"

EXPORTED_FUNCS="_init_curl,_start_request,_request_loop"
RUNTIME_METHODS="addFunction,removeFunction,allocate,ALLOC_NORMAL"
COMPILER_OPTIONS="-o $MODULE_FILE -lcurl -lssl -lcrypto -lcjson -lz -lbrotlidec -lbrotlicommon -I $INCLUDE_DIR -L $LIB_DIR"
EMSCRIPTEN_OPTIONS="-lwebsocket.js -sASYNCIFY -sASYNCIFY_ONLY=start_request,request_loop -sALLOW_TABLE_GROWTH -sEXPORTED_FUNCTIONS=$EXPORTED_FUNCS -sEXPORTED_RUNTIME_METHODS=$RUNTIME_METHODS"

if [ "$1" = "release" ]; then
  COMPILER_OPTIONS="-O3 -flto $COMPILER_OPTIONS"
  EMSCRIPTEN_OPTIONS="-sSINGLE_FILE $EMSCRIPTEN_OPTIONS"
else
  COMPILER_OPTIONS="$COMPILER_OPTIONS --profiling"
fi

#ensure deps are compiled
tools/all_deps.sh
tools/generate_cert.sh

#clean output dir
rm -rf out
mkdir -p out

#compile the main c file - but only if the source has been modified
COMPILE_CMD="emcc main.c $COMPILER_OPTIONS $EMSCRIPTEN_OPTIONS"
echo $COMPILE_CMD
$COMPILE_CMD

#patch the output to work around some emscripten bugs
sed -i 's/err("__syscall_getsockname " \?+ \?fd);//' $MODULE_FILE
sed -i 's/function _emscripten_console_error(str) {/& if(UTF8ToString(str).endsWith("__syscall_setsockopt\\n")) return;/' $MODULE_FILE
sed -i "s/var \?opts \?= \?undefined;/& var parts=addr.split('\/');url=url+parts[0]+':'+port;/" $MODULE_FILE

#merge compiled emscripten module and wrapper code
cp $WRAPPER_SOURCE $OUT_FILE
sed -i "/__emscripten_output__/r $MODULE_FILE" $OUT_FILE
rm $MODULE_FILE

#generate es6 module
cp $OUT_FILE $ES6_FILE
sed -i 's/window.libcurl/export const libcurl/' $ES6_FILE