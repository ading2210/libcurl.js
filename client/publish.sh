#!/bin/bash

#publish libcurl.js as an npm package
#run build.sh first

cp npm/* out
cp ../README.md out
cd out
npm publish