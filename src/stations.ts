import * as fs from "fs/promises";
import * as path from "path";

export interface Station {
  id: number;
  station: string;
  stream: string;
  desc: string;
  logo: string;
}

export async function stationList(): Promise<Station[]> {
  const stationFile =
    process.env["STATION_FILE"] ||
    path.join(__dirname, "..", "data", "stations.json");

  const stationFileString = await fs.readFile(stationFile, {
    encoding: "utf8",
  });
  const stationList = JSON.parse(stationFileString);
  return stationList;
}
