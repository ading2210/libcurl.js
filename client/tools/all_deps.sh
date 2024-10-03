#!/bin/bash

#build all deps

set -e
mkdir -p build

CJSON_PREFIX=$(realpath build/cjson-wasm)
CURL_PREFIX=$(realpath build/curl-wasm)
ZLIB_PREFIX=$(realpath build/zlib-wasm)
BROTLI_PREFIX=$(realpath build/brotli-wasm)

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

cp -r $CJSON_PREFIX/* $CURL_PREFIX
cp -r $ZLIB_PREFIX/* $CURL_PREFIX
cp -r $BROTLI_PREFIX/* $CURL_PREFIX
