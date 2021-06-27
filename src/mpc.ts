import { MPC } from "mpc-js";

export default async function () {
  const mpdHost = process.env["MPD_HOST"] || "localhost";
  const mpdPort = Number.parseInt(process.env["MPD_PORT"] || "6600");
  const mpc = new MPC();
  await mpc.connectTCP(mpdHost, mpdPort);
  console.log(`Connected to MPD on ${mpdHost}:${mpdPort}`);
  return mpc;
}
