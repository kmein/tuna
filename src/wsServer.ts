import MPC from "mpc-js";
import WebSocket from "ws";
import { Station, stationList } from "./stations";
import connectMPD from "./mpc";

type Request =
  | { message: "REQUEST_STATION_LIST" }
  | { message: "REQUEST_STATUS" }
  | { message: "REQUEST_SONG" }
  | { message: "PLAY"; data: Pick<Station, "stream"> }
  | { message: "PAUSE" };

type Response =
  | { message: "MPD_OFFLINE" }
  | { message: "STATUS"; data: MPC.Status }
  | { message: "SONG"; data: MPC.PlaylistItem }
  | { message: "STATION_LIST"; data: Station[] };

async function respond(
  mpc: MPC.MPC,
  request: Request
): Promise<Response | undefined> {
  try {
    switch (request.message) {
      case "REQUEST_STATUS":
        return {
          message: "STATUS",
          data: await mpc.status.status(),
        };
      case "REQUEST_SONG":
        return {
          message: "SONG",
          data: await mpc.status.currentSong(),
        };
      case "REQUEST_STATION_LIST":
        return { message: "STATION_LIST", data: await stationList() };
      case "PAUSE":
        await mpc.playback.pause();
        return;
      case "PLAY":
        if (request.data && request.data.stream) {
          await mpc.currentPlaylist.clear();
          await mpc.currentPlaylist.add(request.data.stream);
        }
        await mpc.playback.play();
        return;
    }
  } catch {
    return { message: "MPD_OFFLINE" };
  }
}

function broadcastMessage(server: WebSocket.Server, response: Response) {
  server.clients.forEach(async (client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(response));
    }
  });
}

export default async function (server: WebSocket.Server) {
  const mpc = await connectMPD();

  mpc.on("changed-player", () =>
    mpc.status.status().then((status) =>
      broadcastMessage(server, {
        message: "STATUS",
        data: status,
      })
    )
  );
  mpc.on("changed-playlist", () =>
    mpc.status.currentSong().then((song) =>
      broadcastMessage(server, {
        message: "SONG",
        data: song,
      })
    )
  );

  server.on("connection", (client: WebSocket, request) => {
    console.log("New client connection to WebSocket");
    client.on("message", (data) => {
      console.log("New message from WebSocket client");
      const request = JSON.parse(data.toString());
      console.log("Got message", request);
      respond(mpc, request).then((response) => {
        if (response) {
          client.send(JSON.stringify(response));
          console.log("Responded with", response);
        }
      });
    });
  });
}
