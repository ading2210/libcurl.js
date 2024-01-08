#!/bin/bash

#export ca certs to a c header file

set -e

CURL_PREFIX=$(realpath build/curl-wasm)
CACERT_FILE="$(realpath build/cacert.pem)"
CACERT_HEADER="$CURL_PREFIX/include/cacert.h"

CACERT_DIR="$(dirname $CACERT_FILE)"
REPLACE_STR="$(echo $CACERT_DIR | tr '/-' '_')"

if [ ! -f $CACERT_FILE ]; then
  wget "https://curl.se/ca/cacert.pem" -O $CACERT_FILE
fi
xxd -i $CACERT_FILE > $CACERT_HEADER
sed -i "s/$REPLACE_STR//" $CACERT_HEADER