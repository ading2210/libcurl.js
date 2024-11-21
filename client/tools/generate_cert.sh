#!/bin/bash

#export ca certs to a c header file

set -e

CURL_PREFIX=$(realpath build/curl-wasm)
CACERT_FILE="$(realpath build/cacert.pem)"
CACERT_HEADER="$CURL_PREFIX/include/cacert.h"

CACERT_DIR="$(dirname $CACERT_FILE)"
REPLACE_STR="$(echo $CACERT_DIR | tr '/-' '_')"

if [ ! -f $CACERT_FILE ]; then
  wget "https://curl.se/ca/cacert.pem" -O "$CACERT_FILE"
  #without this cert open.spotify.com does not work
  #https://github.com/wolfSSL/wolfssl/issues/8137
  new_cert="$(curl "https://www.certainly.com/certificates/Certainly_Intermediate_R1.pem")"
  insert_before="Certainly Root E1"
  replacement="$(printf "\n$new_cert\n\n$insert_before")"

  cacert_str="$(cat "$CACERT_FILE")"
  cacert_str="${cacert_str/"$insert_before"/"$replacement"}"
  echo "$cacert_str" > $CACERT_FILE
fi
xxd -i $CACERT_FILE > $CACERT_HEADER
sed -i "s/$REPLACE_STR//" $CACERT_HEADER