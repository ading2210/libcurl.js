#!/bin/bash

#download and extract wisp-js

set -e

VERSION="0.3.3"
PREFIX=$(realpath build/wisp-js)
TARBALL_PATH="$(realpath build/wisp-archive.tgz)"
TARBALL_URL=$(npm view @mercuryworkshop/wisp-js@$VERSION dist.tarball)

rm -rf $PREFIX
mkdir -p $PREFIX
wget $TARBALL_URL -O $TARBALL_PATH
tar xvf $TARBALL_PATH -C $PREFIX
rm $TARBALL_PATH