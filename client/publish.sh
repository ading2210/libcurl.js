#!/bin/bash

#publish libcurl.js as an npm package

./build.sh all

cp package.json out
cp ../README.md out
cd out
npm publish