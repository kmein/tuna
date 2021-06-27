#!/usr/bin/env node

import * as http from "http";
import WebSocket from "ws";

import httpServer from "./httpServer";
import wsServer from "./wsServer";

const server = http.createServer(httpServer);
const wss = new WebSocket.Server({ server });

wsServer(wss).then(() => {
  const port = httpServer.get("port");
  server.listen(port);
  console.log(`Listening on port ${port}`);
});
