{ yarn2nix-moretea, fetchFromGitHub, nodePackages, nodejs }:
let src = ./.; in
yarn2nix-moretea.mkYarnModules rec {
  pname = "tuna";
  version = "1.0";
  name = "${pname}-${version}";
  packageJSON = "${src}/package.json";
  yarnLock = "${src}/yarn.lock";
  postBuild = ''
    cp -r ${src}/{tsconfig.json,src,public,data} $out/
    cd $out
    ${nodePackages.typescript}/bin/tsc || :
    mkdir -p $out/bin
    echo '#!/bin/sh' > $out/bin/tuna
    echo "export NODE_PATH=$out/dist" >> $out/bin/tuna
    echo "${nodejs}/bin/node $out/dist/app.js" >> $out/bin/tuna
    chmod +x $out/bin/tuna
  '';
}
