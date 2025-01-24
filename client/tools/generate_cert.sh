#!/bin/bash

#export ca certs to a c header file

set -e
set -x

CURL_PREFIX="$(realpath build/curl-wasm)"
CACERT_FILE="$(realpath build/cacert.pem)"
CACERT_HEADER="$CURL_PREFIX/include/cacert.h"

CACERT_DIR="$(dirname "$CACERT_FILE")"
REPLACE_STR="$(echo "$CACERT_DIR" | tr '/-' '_')"

if [ ! -f "$CACERT_FILE" ]; then
  wget "https://curl.se/ca/cacert.pem" -O "$CACERT_FILE"
  python3 tools/gen_cert.py "$CACERT_FILE" > "$CACERT_HEADER"
fi
