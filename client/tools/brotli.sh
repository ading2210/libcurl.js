#!/bin/bash

#compile brotli for use with emscripten

set -x
set -e

CORE_COUNT=$(nproc --all)
PREFIX=$(realpath build/brotli-wasm)

cd build
rm -rf brotli
git clone -b v1.1.0 --depth=1 https://github.com/google/brotli
cd brotli

emcmake cmake . -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=./installed
cmake --build . --config Release --target install

rm -rf $PREFIX
mkdir -p $PREFIX
cp -r installed/* $PREFIX
rm -rf $PREFIX/bin
rm -rf $PREFIX/share
rm -rf $PREFIX/lib/pkgconfig

cd ../../