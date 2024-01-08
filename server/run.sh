#!/bin/bash

#install dependencies and run the proxy server

set -e

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate

if ! python3 -c "import asyncio_socks_server, websockify" 2> /dev/null; then
  pip3 install -r requirements.txt
fi

python3 main.py