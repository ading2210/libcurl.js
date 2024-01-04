#!/bin/bash

#compile cjson for use with emscripten

set -x
set -e

CORE_COUNT=$(nproc --all)
PREFIX=$(realpath build/cjson-wasm)
mkdir -p $PREFIX

cd build
rm -rf cjson
git clone -b master --depth=1 https://github.com/DaveGamble/cJSON cjson
cd cjson

sed -i 's/-fstack-protector-strong//' Makefile
sed -i 's/-fstack-protector//' Makefile

emmake make CC="emcc" static
INCLUDE_FILES="cJSON.h cJSON_Utils.h"
LIB_FILES="libcjson.a libcjson_utils.a"

rm -rf $PREFIX
mkdir -p $PREFIX/include/cjson
mkdir -p $PREFIX/lib
cp $INCLUDE_FILES $PREFIX/include/cjson
cp $LIB_FILES $PREFIX/lib

cd ../../