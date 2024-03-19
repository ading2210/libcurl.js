#!/bin/bash

#download the minicoro library

mkdir -p build/minicoro-wasm/include/
wget "https://raw.githubusercontent.com/edubart/minicoro/main/minicoro.h" -O build/minicoro-wasm/include/minicoro.h