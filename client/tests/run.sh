#!/bin/bash

set -e

trap "exit" INT TERM
trap "kill 0" EXIT
STATIC="$(pwd)" python3 ../server/wisp_server/main.py >/dev/null &

sleep 1
echo "Running tests"
python3 tests/run_tests.py
