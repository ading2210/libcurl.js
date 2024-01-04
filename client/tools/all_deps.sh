#!/bin/bash

#build all deps

mkdir -p build

OPENSSL_PREFIX=$(realpath build/openssl-wasm)
CJSON_PREFIX=$(realpath build/cjson-wasm)
CURL_PREFIX=$(realpath build/curl-wasm)

tools/openssl.sh
tools/cjson.sh
tools/curl.sh

cp -r $OPENSSL_PREFIX/* $CURL_PREFIX
cp -r $CJSON_PREFIX/* $CURL_PREFIX