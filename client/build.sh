#!/bin/bash

set -e

#path definitions
INCLUDE_DIR="build/curl-wasm/include/"
LIB_DIR="build/curl-wasm/lib/"
OUT_FILE="out/libcurl.js"
ES6_FILE="out/libcurl_module.mjs"
MODULE_FILE="out/emscripten_compiled.js"
COMPILED_FILE="out/emscripten_compiled.wasm"
WASM_FILE="out/libcurl.wasm"
FRAGMENTS_DIR="fragments"
WRAPPER_SOURCE="main.js"
WISP_CLIENT="wisp_client"

#read exported functions
EXPORTED_FUNCS=""
for func in $(cat exported_funcs.txt); do
  EXPORTED_FUNCS="$EXPORTED_FUNCS,_$func"
done
EXPORTED_FUNCS="${EXPORTED_FUNCS:1}"

#compile options
RUNTIME_METHODS="addFunction,removeFunction,allocate,ALLOC_NORMAL"
COMPILER_OPTIONS="-o $MODULE_FILE -lcurl -lssl -lcrypto -lcjson -lz -lbrotlidec -lbrotlicommon -lnghttp2 -I $INCLUDE_DIR -L $LIB_DIR"
EMSCRIPTEN_OPTIONS="-lwebsocket.js -sASSERTIONS=1 -sLLD_REPORT_UNDEFINED -sALLOW_TABLE_GROWTH -sALLOW_MEMORY_GROWTH -sEXPORTED_FUNCTIONS=$EXPORTED_FUNCS -sEXPORTED_RUNTIME_METHODS=$RUNTIME_METHODS"

if [[ "$*" == *"release"* ]]; then
  COMPILER_OPTIONS="-Oz -flto $COMPILER_OPTIONS"
  echo "note: building with release optimizations"
else
  COMPILER_OPTIONS="$COMPILER_OPTIONS --profiling"
fi

if [[ "$*" == *"single_file"* ]]; then
  EMSCRIPTEN_OPTIONS="-sSINGLE_FILE $EMSCRIPTEN_OPTIONS"
  echo "note: building as a single js file"
fi

#ensure deps are compiled
tools/all_deps.sh
tools/generate_cert.sh

#clean output dir
rm -rf out
mkdir -p out

#compile the main c file - but only if the source has been modified
COMPILE_CMD="emcc *.c $COMPILER_OPTIONS $EMSCRIPTEN_OPTIONS"
echo $COMPILE_CMD
$COMPILE_CMD
mv $COMPILED_FILE $WASM_FILE || true

#merge compiled emscripten module and wrapper code
cp $WRAPPER_SOURCE $OUT_FILE
sed -i "/__emscripten_output__/r $MODULE_FILE" $OUT_FILE
rm $MODULE_FILE

#add extra libraries
sed -i "/__extra_libraries__/r $WISP_CLIENT/polyfill.js" $OUT_FILE
sed -i "/__extra_libraries__/r $WISP_CLIENT/wisp.js" $OUT_FILE
sed -i "/__extra_libraries__/r ./messages.js" $OUT_FILE
sed -i "/__extra_libraries__/r ./websocket.js" $OUT_FILE

#apply patches
python3 scripts/patcher.py $FRAGMENTS_DIR $OUT_FILE

#generate es6 module
cp $OUT_FILE $ES6_FILE
sed -i 's/window.libcurl/export const libcurl/' $ES6_FILE