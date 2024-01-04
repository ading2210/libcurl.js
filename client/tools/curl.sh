#!/bin/bash

#compile openssl for use with emscripten

set -x
set -e

CORE_COUNT=$(nproc --all)
PREFIX=$(realpath build/curl-wasm)
OPENSSL_PREFIX=$(realpath build/openssl-wasm)
mkdir -p $PREFIX

cd build
rm -rf curl
git clone -b master --depth=1 https://github.com/curl/curl
cd curl

autoreconf -fi
emconfigure ./configure --host i686-linux --prefix=$PREFIX --disable-shared --disable-threaded-resolver --without-libpsl --disable-netrc --disable-ipv6 --disable-tftp --disable-ntlm-wb --with-ssl=$OPENSSL_PREFIX
emmake make -j$CORE_COUNT CFLAGS="-pthread"

rm -rf $PREFIX/include/*
rm -rf $PREFIX/lib/*
mkdir -p $PREFIX/include
mkdir -p $PREFIX/lib
cp -r include/curl $PREFIX/include
cp lib/.libs/libcurl.a $PREFIX/lib
cp -r $OPENSSL_PREFIX/* $PREFIX

cd ../../