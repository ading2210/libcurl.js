import logging
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

def start_websockify(listen_port, proxy_port):
  options = {
    "listen_host": "127.0.0.1", 
    "listen_port": int(listen_port), 
    "target_host": "127.0.0.1", 
    "target_port": int(proxy_port)
  }

  server = WebSocketProxy(**options)
  server.start_server()

def start_socks(proxy_port):
  socks_app = SocksServer(
    LISTEN_HOST="127.0.0.1",
    LISTEN_PORT=int(proxy_port)
  )
  socks_app.run()

if __name__ == "__main__":
  listen_port = os.environ.get("PORT") or 6001
  proxy_port = os.environ.get("SOCKS5_PORT") or 6002

  pid = os.fork()
  if pid == 0:
    setup_logging("[websockify] ")
    start_websockify(listen_port, proxy_port)
  else:
    start_socks(proxy_port)