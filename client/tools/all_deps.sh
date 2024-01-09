#!/bin/bash

#build all deps

mkdir -p build

OPENSSL_PREFIX=$(realpath build/openssl-wasm)
CJSON_PREFIX=$(realpath build/cjson-wasm)
CURL_PREFIX=$(realpath build/curl-wasm)
ZLIB_PREFIX=$(realpath build/zlib-wasm)
BROTLI_PREFIX=$(realpath build/brotli-wasm)

if [ ! -d $OPENSSL_PREFIX ]; then
  tools/openssl.sh
fi
if [ ! -d $CJSON_PREFIX ]; then
  tools/cjson.sh
fi
if [ ! -d $ZLIB_PREFIX ]; then
  tools/zlib.sh
fi
if [ ! -d $BROTLI_PREFIX ]; then
  tools/brotli.sh
fi
if [ ! -d $CURL_PREFIX ]; then
  tools/curl.sh
fi

cp -r $OPENSSL_PREFIX/* $CURL_PREFIX
cp -r $CJSON_PREFIX/* $CURL_PREFIX
cp -r $ZLIB_PREFIX/* $CURL_PREFIX
cp -r $BROTLI_PREFIX/* $CURL_PREFIX