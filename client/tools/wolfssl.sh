#!/bin/bash

#compile wolfssl for use with emscripten

set -x
set -e

CORE_COUNT=$(nproc --all)
PREFIX=$(realpath build/wolfssl-wasm)
rm -rf $PREFIX
mkdir -p $PREFIX

cd build
rm -rf wolfssl
git clone -b v5.7.2-stable --depth=1 https://github.com/wolfSSL/wolfssl wolfssl
cd wolfssl

autoreconf -fi
export CFLAGS="-Oz -DSP_WORD_SIZE=32 -DWOLFSSL_NO_ATOMICS -DWOLFSSL_MAX_ALT_NAMES=1024" 
emconfigure ./configure --prefix=$PREFIX --enable-curl --enable-static --disable-shared --host=i686-linux --disable-examples --disable-asm --enable-sni --enable-alpn --enable-truncatedhmac --enable-tlsv12 --enable-all-crypto --disable-arc4 --disable-asyncthreads --disable-threadlocal --enable-tlsx --disable-nullcipher 
emmake make -j$CORE_COUNT
make install

rm -rf $PREFIX/bin
rm -rf $PREFIX/share
rm -rf $PREFIX/lib/pkgconfig
rm -rf $PREFIX/lib/*.la

cd ../../