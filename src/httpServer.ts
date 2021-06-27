import express from "express";
import * as path from "path";
import favicon from "serve-favicon";
import logger from "morgan";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

const app = express();

app.use(favicon(path.join(__dirname, "..", "public", "favicon.ico")));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use((req, res) => {
  res.status(404);
  res.send();
});

const port = Number.parseInt(process.env["PORT"] || "4200");
app.set("port", port);

export default app;
