import asyncio
from websockets.server import serve
from websockets.exceptions import ConnectionClosed

buffer_size = 64*1024

class Connection:
  def __init__(self, ws, path):
    self.ws = ws
    self.path = path

  async def setup_connection(self):
    addr_str = self.path.split("/")[-1]
    self.tcp_host, self.tcp_port = addr_str.split(":")
    self.tcp_port = int(self.tcp_port)

    self.tcp_reader, self.tcp_writer = await asyncio.open_connection(host=self.tcp_host, port=self.tcp_port, limit=buffer_size)

  async def handle_ws(self):
    while True:
      try:
        data = await self.ws.recv()
      except ConnectionClosed:
        break
      self.tcp_writer.write(data)
      await self.tcp_writer.drain()
      print("sent data to tcp")
    
    self.tcp_writer.close()
  
  async def handle_tcp(self):
    while True:
      data = await self.tcp_reader.read(buffer_size)
      if len(data) == 0:
        break #socket closed
      await self.ws.send(data)
      print("sent data to ws")
    
    await self.ws.close()

async def connection_handler(websocket, path):
  print("incoming connection from "+path)
  connection = Connection(websocket, path)
  await connection.setup_connection()
  ws_handler = asyncio.create_task(connection.handle_ws())
  tcp_handler = asyncio.create_task(connection.handle_tcp())
  
  await asyncio.gather(ws_handler, tcp_handler)

async def main():
  async with serve(connection_handler, "127.0.0.1", 6001):
    await asyncio.Future()

if __name__ == "__main__":
  asyncio.run(main())
