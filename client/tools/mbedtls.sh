#!/bin/bash

#compile mbedtls for use with emscripten

set -x
set -e

CORE_COUNT=$(nproc --all)
PREFIX=$(realpath build/mbedtls-wasm)
rm -rf $PREFIX
mkdir -p $PREFIX

cd build
rm -rf mbedtls
git clone -b mbedtls-3.6.2 --recursive --depth=1 https://github.com/Mbed-TLS/mbedtls mbedtls
cd mbedtls

emmake make CFLAGS="-Oz" no_test -j$CORE_COUNT
make DESTDIR="$PREFIX" install

rm -rf $PREFIX/bin
rm -rf $PREFIX/share
rm -rf $PREFIX/lib/pkgconfig
rm -rf $PREFIX/lib/*.la

cd ../../