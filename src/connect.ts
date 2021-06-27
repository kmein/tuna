import MPC from "mpc-js";
import WebSocket from "ws";
import connectMPD from "./mpc";
import { Station, stationList } from "./stations";
const debug = require("debug")("mpd.fm:wss");

type MpdFmRequest =
  | { message: "REQUEST_STATION_LIST" }
  | { message: "REQUEST_STATUS" }
  | { message: "PLAY"; data: Pick<Station, "stream"> }
  | { message: "PAUSE" };

type MpdFmResponse =
  | { message: "MPD_OFFLINE" }
  | { message: "STATION_LIST"; data: Station[] }
  | { message: "STATUS"; data: MPC.Status }
  | { message: "SONG"; data: MPC.PlaylistItem };

async function respond(
  mpc: MPC.MPC,
  request: MpdFmRequest
): Promise<MpdFmResponse | undefined> {
  switch (request.message) {
    case "REQUEST_STATION_LIST":
      const data = await stationList();
      return { message: "STATION_LIST", data };
    case "REQUEST_STATUS":
      try {
        const status = await mpc.status.status();
        return { message: "STATUS", data: status };
      } catch {
        return { message: "MPD_OFFLINE" };
      }
    case "PLAY":
      try {
        if (request.data && request.data.stream) {
          await mpc.currentPlaylist.clear();
          await mpc.currentPlaylist.add(request.data.stream);
        }
        await mpc.playback.play();
        return;
      } catch {
        return { message: "MPD_OFFLINE" };
      }
    case "PAUSE":
      try {
        await mpc.playback.pause();
        return;
      } catch {
        return { message: "MPD_OFFLINE" };
      }
    default:
      return;
  }
}

export default async function (server: WebSocket.Server) {
  const mpc = await connectMPD();
  server.on("connection", (client, request) => {
    debug("New client connected %o", client);
    mpc.on("changed-player", () => {
      mpc.status.status().then((status) => {
        server.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN)
            client.send(JSON.stringify({ message: "STATUS", data: status }));
        });
      });
    });
    client.on("message", (data) => {
      const request: MpdFmRequest = JSON.parse(data.toString());
      debug("New message from client %o: %o", client, request);
      respond(mpc, request).then((response) => {
        if (response) {
          debug("Responding to client %o: %o", client, response);
          client.send(JSON.stringify(response));
        }
      });
    });
  });
}
