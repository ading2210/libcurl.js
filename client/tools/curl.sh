#!/bin/bash

#compile openssl for use with emscripten

set -x
set -e

CORE_COUNT=$(nproc --all)
PREFIX=$(realpath build/curl-wasm)
WOLFSSL_PREFIX=$(realpath build/wolfssl-wasm)
ZLIB_PREFIX=$(realpath build/zlib-wasm)
BROTLI_PREFIX=$(realpath build/brotli-wasm)

cd build
rm -rf curl
git clone -b master --depth=1 https://github.com/curl/curl
cd curl

autoreconf -fi
emconfigure ./configure --host i686-linux --disable-shared --disable-threaded-resolver --without-libpsl --disable-netrc --disable-ipv6 --disable-tftp --disable-ntlm-wb --enable-websockets --with-wolfssl=$WOLFSSL_PREFIX --with-zlib=$ZLIB_PREFIX --with-brotli=$BROTLI_PREFIX
emmake make -j$CORE_COUNT CFLAGS="-Oz -pthread" LIBS="-lbrotlicommon"

rm -rf $PREFIX
mkdir -p $PREFIX/include
mkdir -p $PREFIX/lib
cp -r include/curl $PREFIX/include
cp lib/.libs/libcurl.a $PREFIX/lib

cd ../../