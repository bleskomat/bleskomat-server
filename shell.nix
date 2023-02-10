# the last successful build of nixpkgs-unstable as of 2022-11-21
with import
  (builtins.fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/19230cff31fd7562562dd25181579fa7087f0f89.tar.gz";
    sha256 = "1ds3rgwqhgrydzzazz5lqi825k38lp8hm62ggh8dfxh6c6b7h3jl";
  })
{ };

let
  nodejs = nodejs-16_x;
in
  stdenv.mkDerivation {
    name = "bleskomat-server-dev";
    buildInputs = [
      nodejs
    ];
  }
