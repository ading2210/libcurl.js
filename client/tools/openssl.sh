#!/bin/bash

#compile openssl for use with emscripten

set -x
set -e

CORE_COUNT=$(nproc --all)
PREFIX=$(realpath build/openssl-wasm)
mkdir -p $PREFIX

cd build
rm -rf openssl
git clone -b master --depth=1 https://github.com/openssl/openssl
cd openssl

export CFLAGS="-Wall -Oz"
export CXXFLAGS="-Wall -Oz"
emconfigure ./Configure linux-x32 --prefix=$PREFIX -no-asm -static -no-afalgeng -no-dso -DOPENSSL_SYS_NETWARE -DSIG_DFL=0 -DSIG_IGN=0 -DHAVE_FORK=0 -DOPENSSL_NO_AFALGENG=1 -DOPENSSL_NO_SPEED=1 -DOPENSSL_NO_DYNAMIC_ENGINE -DDLOPEN_FLAG=0
sed -i 's|^CROSS_COMPILE.*$|CROSS_COMPILE=|g' Makefile
emmake make -j$CORE_COUNT build_generated libssl.a libcrypto.a

rm -rf $PREFIX/include/*
rm -rf $PREFIX/lib/*
mkdir -p $PREFIX/include
mkdir -p $PREFIX/lib
cp -r include/openssl $PREFIX/include
cp libcrypto.a libssl.a $PREFIX/lib

cd ../../