#!/bin/bash

#download and extract wisp-js

set -e

VERSION="0.3.3"
PREFIX=$(realpath build/wisp-js)
TARBALL_PATH="$(realpath build/wisp-archive.tar.gz)"
TARBALL_URL=$(npm view @mercuryworkshop/wisp-js@$VERSION dist.tarball)

if [ -d "$PREFIX" ]; then
  exit
fi

rm -rf $PREFIX
mkdir -p $PREFIX
wget $TARBALL_URL -O $TARBALL_PATH
tar xf $TARBALL_PATH -C $PREFIX
rm $TARBALL_PATH