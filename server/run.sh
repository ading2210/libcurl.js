#!/bin/bash

#install dependencies and run the proxy server

set -e

SCRIPT_PATH=$(realpath $0)
BASE_PATH=$(dirname $SCRIPT_PATH)
SERVER_PATH="$BASE_PATH/wisp_server"

if [ ! -d "$SERVER_PATH.venv" ]; then
  python3 -m venv $SERVER_PATH/.venv
fi
source $SERVER_PATH/.venv/bin/activate

if ! python3 -c "import websockets, asyncudp, uvloop" 2> /dev/null; then
  pip3 install -e $SERVER_PATH
fi

python3 -m wisp.server "$@"