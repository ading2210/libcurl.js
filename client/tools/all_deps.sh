#!/bin/bash

#build all deps

set -e
mkdir -p build

OPENSSL_PREFIX=$(realpath build/openssl-wasm)
CJSON_PREFIX=$(realpath build/cjson-wasm)
CURL_PREFIX=$(realpath build/curl-wasm)
ZLIB_PREFIX=$(realpath build/zlib-wasm)
BROTLI_PREFIX=$(realpath build/brotli-wasm)
NGHTTP2_PREFIX=$(realpath build/nghttp2-wasm)
MINICORO_PREFIX=$(realpath build/minicoro-wasm)

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
if [ ! -d $NGHTTP2_PREFIX ]; then
  tools/nghttp2.sh
fi
if [ ! -d $CURL_PREFIX ]; then
  tools/curl.sh
fi
if [ ! -d $MINICORO_PREFIX ]; then
  tools/minicoro.sh
fi

cp -r $OPENSSL_PREFIX/* $CURL_PREFIX
cp -r $CJSON_PREFIX/* $CURL_PREFIX
cp -r $ZLIB_PREFIX/* $CURL_PREFIX
cp -r $BROTLI_PREFIX/* $CURL_PREFIX
cp -r $NGHTTP2_PREFIX/* $CURL_PREFIX
cp -r $MINICORO_PREFIX/* $CURL_PREFIX