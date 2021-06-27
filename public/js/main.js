"use strict";

let socket = null;
const DefaultSongText = "Select a station";
const DefaultMpdErrorText = "Trying to reconnect...";
let lastMpdReconnectAttempt = 0;

let timer = {
  // All in ms
  mpdLastUpdate: 0,
  lastMpdUpdateTimestamp: 0,

  displayedTime: 0,
  lastDisplayTimestamp: 0,
};

Vue.component("radio-station", {
  props: ["station"],
});

var app = new Vue({
  el: "#app",
  data: {
    stationList: [],
    status: "loading", // playing, stopped, paused
    elapsed: "0:00",
    song: DefaultSongText,
    currentStation: null,
    currentFile: null,
    errorState: {
      wssDisconnect: true,
      mpdServerDisconnect: true,
    },
  },
  created() {
    this.connectWSS();
    this.updateElapsed();
  },
  watch: {
    song(newSong) {
      if (newSong && newSong.length > 0) document.title = newSong + " | Tuna";
    },
  },
  methods: {
    connectWSS() {
      // Connect to WebSocket server
      const url = `ws://${location.hostname}${
        location.port ? `:${location.port}` : ""
      }`;

      socket = new ReconnectingWebSocket(url, null, {
        reconnectInterval: 3000,
      });

      socket.onopen = () => {
        this.errorState.wssDisconnect = false;
        this.sendWSSMessage({ message: "REQUEST_STATION_LIST" });
        this.sendWSSMessage({ message: "REQUEST_STATUS" });
        this.sendWSSMessage({ message: "REQUEST_SONG" });
      };

      socket.onmessage = (message) => {
        this.errorState.wssDisconnect = false;
        const msg = JSON.parse(message.data);
        // console.log(msg);
        switch (msg.message) {
          case "STATION_LIST":
            this.stationList = msg.data;
            if (!this.currentStation && this.currentFile)
              this.setCurrentStation(this.currentFile);
            break;
          case "STATUS":
            timer.lastDisplayTimestamp = 0;
            this.setPlayState(msg.data.state);
            this.setElapsedTime(msg.data.elapsed);
            break;
          case "SONG":
            if (msg.data) {
              this.setCurrentStation(msg.data.path);
              this.setSongName(msg.data.title, msg.data.album, msg.data.artist);
            }
            break;
          case "MPD_OFFLINE":
            this.status = "loading";
            this.currentStation = null;
            this.currentFile = null;
            this.elapsed = "0:00";
            this.song = DefaultMpdErrorText;
            this.errorState.mpdServerDisconnect = true;
            setTimeout(() => {
              if (Date.now() - lastMpdReconnectAttempt >= 2500) {
                lastMpdReconnectAttempt = Date.now();
                this.sendWSSMessage({ message: "REQUEST_STATUS" });
              }
            }, 3000);
            return;
        }

        this.errorState.mpdServerDisconnect = false;
      };

      socket.onerror = socket.onclose = (err) => {
        this.errorState.wssDisconnect = true;
      };
    },

    onPlayButton(event) {
      switch (this.status) {
        case "playing":
          this.status = "loading";
          this.sendWSSMessage({ message: "PAUSE" });
          break;
        case "stopped":
        case "paused":
          this.status = "loading";
          this.sendWSSMessage({ message: "PLAY" });
          break;
        default:
          this.sendWSSMessage({ message: "REQUEST_STATUS" });
          break;
      }
    },

    playRandomStation() {
      const randomIndex = Math.floor(Math.random() * this.stationList.length);
      const randomStation = this.stationList[randomIndex];
      this.onPlayStation(randomStation.stream);
    },

    onPlayStation(stream) {
      this.status = "loading";
      this.currentStation = null;
      this.elapsed = "0:00";
      this.song = "";
      this.sendWSSMessage({ message: "PLAY", data: { stream } });
    },

    updateElapsed() {
      let timeout = 1000;
      if (this.status === "playing") {
        // Last MPD update + the time passed since then
        const bestGuessOnMpdTime =
          timer.mpdLastUpdate + Date.now() - timer.lastMpdUpdateTimestamp;

        if (timer.lastDisplayTimestamp <= 0) {
          // Initialize display to latest MPD update + the time passed since then
          timer.displayedTime = bestGuessOnMpdTime;
          timer.lastDisplayTimestamp = Date.now();
        }
        // Advance displayed timer by the time passed since it has been last updated for the user
        timer.displayedTime += Math.max(
          Date.now() - timer.lastDisplayTimestamp,
          0
        );

        // Calculate difference to best guess
        const delta = timer.displayedTime - bestGuessOnMpdTime;

        if (Math.abs(delta) > 3000) {
          timer.displayedTime = bestGuessOnMpdTime;
        } else {
          const timeoutShorterToRecoverIn10Secs = delta / 10;
          timeout = Math.min(
            Math.max(timeout - timeoutShorterToRecoverIn10Secs, 0),
            2000
          );
          timer.displayedTime -= timeoutShorterToRecoverIn10Secs;
        }
      } else if (this.status === "paused") {
        timer.displayedTime = timer.mpdLastUpdate;
      } else {
        timer.displayedTime = 0;
      }

      this.changeDisplayTimer(timer.displayedTime);
      timer.lastDisplayTimestamp = Date.now();

      setTimeout(() => {
        this.updateElapsed();
      }, timeout);

      if (
        this.status === "playing" &&
        Date.now() - timer.lastMpdUpdateTimestamp > 10000
      ) {
        this.sendWSSMessage({ message: "REQUEST_STATUS" });
        this.sendWSSMessage({ message: "REQUEST_SONG" });
      }
    },

    setElapsedTime(elapsed) {
      if (!isNaN(parseFloat(elapsed)) && isFinite(elapsed)) {
        timer.mpdLastUpdate = elapsed * 1000;
      } else {
        timer.mpdLastUpdate = 0;
      }
      timer.lastMpdUpdateTimestamp = Date.now();
    },

    setPlayState(state) {
      switch (state) {
        case "play":
          this.status = "playing";
          break;
        case "stop":
          this.status = "stopped";
          break;
        case "pause":
          this.status = "paused";
          break;
        default:
          this.status = "loading";
          break;
      }
    },

    setCurrentStation(file) {
      this.currentFile = file;
      const station = this.stationList.find(
        (station) => station.stream === file
      );
      if (station) {
        if (!this.currentStation || this.currentStation.stream !== file)
          this.currentStation = station;
      } else {
        this.song = DefaultSongText;
        this.currentStation = null;
      }
    },

    setSongName(title, album, artist) {
      if (!title && !album && !artist && !this.currentStation) {
        this.song = DefaultSongText;
      } else {
        let text = "";
        if (typeof artist != "undefined" && artist.length > 0) {
          text = artist;
        }
        if (typeof album != "undefined" && album.length > 0) {
          text += (text.length > 0 ? " – " : "") + album;
        }
        if (typeof title != "undefined" && title.length > 0) {
          text += (text.length > 0 ? " – " : "") + title;
        }
        this.song = text;
      }
    },

    changeDisplayTimer(ms) {
      const timeInSec = ms / 1000;
      const hours = Math.floor(timeInSec / 3600);
      const minutes = Math.floor(timeInSec / 60 - hours * 60);
      const seconds = Math.floor(timeInSec - hours * 3600 - minutes * 60);
      let strToDisplay = hours > 0 ? hours + ":" : "";
      strToDisplay +=
        hours > 0 && minutes < 10 ? "0" + minutes + ":" : minutes + ":";
      strToDisplay += (seconds < 10 ? "0" : "") + seconds;
      this.elapsed = strToDisplay;
    },

    sendWSSMessage(message) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        this.errorState.wssDisconnect = true;
      }
    },
  },
});
