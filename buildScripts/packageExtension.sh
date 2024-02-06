#!/bin/bash
if [ $# -ne 2 ]; then
    echo "Usage: $0 <output_vsix_name> <output-vsix-version>"
    exit 1
fi

npm i
echo "TBD" >LICENSE
../build/vsce/node_modules/@vscode/vsce/vsce package --out ../build/$1-$2.vsix