#!/bin/bash

#compile nghttp2 for use with emscripten

set -x
set -e

CORE_COUNT=$(nproc --all)
PREFIX=$(realpath build/nghttp2-wasm)

cd build
rm -rf nghttp2
git clone -b v1.64.0 --depth=1 https://github.com/nghttp2/nghttp2
cd nghttp2

rm -rf $PREFIX
mkdir -p $PREFIX

autoreconf -fi
emconfigure ./configure --host i686-linux --enable-static --disable-shared --enable-lib-only --prefix=$PREFIX
emmake make -j$CORE_COUNT
make install

cd ../../