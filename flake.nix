{
  description = "MPD web radio front-end (tuner)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = inputs@{flake-utils, nixpkgs, self, ...}:
  flake-utils.lib.eachDefaultSystem (system: let
    pkgs = import nixpkgs {inherit system;};
  in {
    devShell = pkgs.mkShell rec {
      buildInputs = [
        pkgs.mpd
        pkgs.mpc_cli
      ];
    };
    defaultPackage = self.packages.${system}.tuna;
    packages.tuna = pkgs.mkYarnPackage rec {
      pname = "tuna";
      version = "1.0";
      src = nixpkgs.lib.cleanSource ./.;
      name = "${pname}-${version}";
      buildPhase = ''
        yarn build
        # XXX https://github.com/microsoft/TypeScript/issues/37583
        chmod +x deps/${pname}/${(nixpkgs.lib.importJSON ./package.json).bin}
      '';
      nodejs = pkgs.nodejs-18_x;
    };

    nixosModule = { config, lib, pkgs, ... }: let cfg = config.services.tuna; in with nixpkgs.lib; {
      options.services.tuna = {
        enable = mkEnableOption "Tuna, an MPD web UI for radio streams";

        webPort = mkOption {
          type = types.port;
          default = 4200;
        };

        stations = mkOption {
          default = [];
          type = types.listOf (types.submodule {
            options = {
              id = mkOption {
                type = types.int;
                description = "A unique identifier of the station";
              };
              station = mkOption {
                type = types.str;
                description = "Name of the station that should be displayed";
              };
              desc = mkOption {
                type = types.nullOr types.str;
                description = "Short description of the station (optional)";
              };
              logo = mkOption {
                type = types.str;
                description = "URL to a logo of the station (any size)";
              };
              stream = mkOption {
                type = types.str;
                description = "URL to the stream of the radio station (in a format supported by MPD such as MP3, OGG, ...)";
              };
            };
          });
        };

        stationsFile = mkOption {
          type = types.path;
          default = (pkgs.formats.json {}).generate "stations.json" cfg.stations;
        };

        package = mkOption {
          type = types.package;
          default = inputs.self.defaultPackage.${builtins.currentSystem};
        };

        mpd = {
          host = mkOption {
            type = types.str;
            default = "localhost";
            description = "The host where MPD is listening.";
            example = "localhost";
          };

          port = mkOption {
            type = types.port;
            default = config.services.mpd.network.port;
            description = "The port where MPD is listening.";
            example = 6600;
          };
        };
      };

      config = mkIf cfg.enable {
        # ref https://github.com/florianheinemann/MPD.FM/blob/9d037cf87597b26ae2f10ba9feea48946ad6cc68/service/MPD.FM.service
        systemd.services.tuna = {
          wantedBy = ["multi-user.target"];
          after = ["mpd.service"];
          environment = {
            NODE_ENV = "production";
            MPD_HOST = cfg.mpd.host;
            MPD_PORT = toString cfg.mpd.port;
            PORT = toString cfg.webPort;
            STATION_FILE = cfg.stationsFile;
          };
          serviceConfig = {
            Restart = "always";
            DynamicUser = true;
            ExecStart = "${cfg.package}/bin/tuna";
          };
        };
      };
    };
  });
}
