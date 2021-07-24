{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = [ pkgs.mpd pkgs.mpc_cli ];
  shellHook = ''
    export HISTFILE=${toString ./.history}
  '';
}
