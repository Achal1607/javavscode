#!/bin/bash
if [ $# -ne 2 ]; then
    echo "Usage: $0 <output_vsix_name> <output-vsix-version>"
    exit 1
fi

npm i
mkdir build
# cd build
echo "TBD" >LICENSE
npm i @vscode/vsce@2.19.0
./node_modules/@vscode/vsce/vsce package --out build/$1-$2.vsix