#!/bin/bash

set -e

INCLUDE_DIR="build/curl-wasm/include/"
LIB_DIR="build/curl-wasm/lib/"
OUT_FILE="out/libcurl.js"
ES6_FILE="out/libcurl_module.mjs"
MODULE_FILE="out/emscripten_compiled.js"
FRAGMENTS_DIR="fragments"
WRAPPER_SOURCE="main.js"
WISP_CLIENT="wisp_client"

EXPORTED_FUNCS="_init_curl,_start_request,_tick_request,_active_requests"
RUNTIME_METHODS="addFunction,removeFunction,allocate,ALLOC_NORMAL"
COMPILER_OPTIONS="-o $MODULE_FILE -lcurl -lssl -lcrypto -lcjson -lz -lbrotlidec -lbrotlicommon -lnghttp2 -I $INCLUDE_DIR -L $LIB_DIR"
EMSCRIPTEN_OPTIONS="-lwebsocket.js -sASSERTIONS=1 -sALLOW_TABLE_GROWTH -sALLOW_MEMORY_GROWTH -sEXPORTED_FUNCTIONS=$EXPORTED_FUNCS -sEXPORTED_RUNTIME_METHODS=$RUNTIME_METHODS"

if [ "$1" = "release" ]; then
  COMPILER_OPTIONS="-Oz -flto $COMPILER_OPTIONS"
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

#merge compiled emscripten module and wrapper code
cp $WRAPPER_SOURCE $OUT_FILE
sed -i "/__emscripten_output__/r $MODULE_FILE" $OUT_FILE
rm $MODULE_FILE

#add wisp libraries
sed -i "/__extra_libraries__/r $WISP_CLIENT/polyfill.js" $OUT_FILE
sed -i "/__extra_libraries__/r $WISP_CLIENT/wisp.js" $OUT_FILE
sed -i "/__extra_libraries__/r ./messages.js" $OUT_FILE

#apply patches
python3 patcher.py $FRAGMENTS_DIR $OUT_FILE

#generate es6 module
cp $OUT_FILE $ES6_FILE
sed -i 's/window.libcurl/export const libcurl/' $ES6_FILE