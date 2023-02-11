{
  description = "A Flake for bleskomat-server";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-22.11";
    dream2nix.url = "github:nix-community/dream2nix";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };
  outputs = { self, nixpkgs, flake-parts, dream2nix, ... }@inputs:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.dream2nix.flakeModuleBeta
      ];
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      flake = {
        overlay = final: prev: {
          bleskomat-server = self.packages.${prev.stdenv.hostPlatform.system}.bleskomat-server;
        };
      };
      perSystem = { config, self', inputs', pkgs, system, ... }: {
        dream2nix.inputs."bleskomat-server" = {
          source = self;
        };
        packages = rec {
          default = bleskomat-server-executable;
          bleskomat-server-executable = pkgs.writeShellScriptBin "bleskomat-server" ''
            export PATH="$PWD/node_modules/.bin/:${pkgs.nodejs}/bin"
            node ${self'.packages.bleskomat-server}/lib/node_modules/bleskomat-server/index.js
          '';
        };
      };
    };
}
