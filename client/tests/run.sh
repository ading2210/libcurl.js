#!/bin/bash

set -e

trap "exit" INT TERM
trap "kill 0" EXIT
../server/run.sh --static=$(pwd) >/dev/null &

echo -n "waiting for wisp server to start"
i=0
until $(curl --output /dev/null --silent --head "http://localhost:6001/"); do
  if [ "$i" = "30" ]; then
    echo -e "\ntests failed. wisp server failed to start"
    exit 1
  fi

  echo -n "."
  i=$(($i+1))
  sleep 1
done
echo 


sleep 1
echo "wisp server ready, running tests"
python3 tests/run_tests.py
