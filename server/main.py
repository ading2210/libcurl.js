import logging
import threading
import os

from asyncio_socks_server.app import SocksServer
from websockify.websocketproxy import WebSocketProxy

#start a socks5 proxy as well as websockify

def setup_logging(prefix):
  stderr_handler = logging.StreamHandler()
  stderr_handler.setLevel(logging.DEBUG)
  log_formatter = logging.Formatter(prefix + "%(message)s")
  stderr_handler.setFormatter(log_formatter)
  root = logging.getLogger()
  root.addHandler(stderr_handler)
  root.setLevel(logging.INFO)

def start_websockify():
  options = {
    "listen_host": "127.0.0.1", 
    "listen_port": 6001, 
    "target_host": "127.0.0.1", 
    "target_port": 1080
  }

  server = WebSocketProxy(**options)
  server.start_server()

def start_socks():
  socks_app = SocksServer(
    LISTEN_HOST="127.0.0.1",
    LISTEN_PORT=1080
  )
  socks_app.run()

if __name__ == "__main__":
  pid = os.fork()
  if pid == 0:
    setup_logging("[websockify] ")
    start_websockify()
  else:
    start_socks()