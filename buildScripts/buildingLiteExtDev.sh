rm -rf vscode/nbcode
rm -rf nbcode/dist
rm -rf nbcode/build
ant dev-regenerate-disabled-modules 
./buildScripts/compareWithFullExt.sh
ant build-vscode-ext