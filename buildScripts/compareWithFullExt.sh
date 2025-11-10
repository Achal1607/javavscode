#!/bin/bash

cd /Users/atalati/vscode-extension/extension-pack/javavscode/comparisionModules
sort  /Users/atalati/vscode-extension/extension-pack/javavscode/txtFiles/overallDisabledModules.txt > sortedExtPack.txt
diff -u sortedNormalExt.txt sortedExtPack.txt | sort | grep "^\+[a-z]" > extraModulesDisabledInPack.txt
diff -u originalModulesToEnableInLite.txt extraModulesDisabledInPack.txt | sort | grep "^\-+" > nowEnabled.txt