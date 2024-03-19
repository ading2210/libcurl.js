#!/bin/bash

#publish libcurl.js as an npm package

./build.sh all

cp package.json out
cp ../README.md out
cp ../LICENSE out
cp ../CHANGELOG.md out

cd out
npm publish