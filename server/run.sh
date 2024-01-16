#!/bin/bash

#install dependencies and run the proxy server

set -e

cd wisp_server
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate

if ! python3 -c "import websockets" 2> /dev/null; then
  pip3 install -r requirements.txt
fi

python3 main.py