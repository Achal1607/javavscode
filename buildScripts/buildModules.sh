#!/bin/bash
if [ $# -ne 3 ]; then
    echo "Usage: $0 <path_to_modules_list_file> <cluster_dir> <nbcode_path>"
    exit 1
fi

(cd netbeans;

# Loop through each 'manifest.mf' file found in subdirectories
for m in */*/manifest.mf; do
    # Extract the module name from 'OpenIDE-Module' line in the manifest file
    CNB=`grep 'OpenIDE-Module:' <$m | cut -d ':' -f 2- | cut -d '/' -f 1`
    
    # Check if the module name is not empty
    if [ "x$CNB" != "x" ]; then
        # Check if the module name exists in the list file 'modules list'
        if grep -x ${CNB} $1 >/dev/null 2>&1; then
            echo "$1"
            # If module name exists, change directory to the module and build using Ant with specified cluster directory
            (cd `dirname $m`; ant -Dcluster.dir=$2 netbeans; pwd)
        fi
    fi
done

rm -rf "../$3"

# Copy the built files from 'nbbuild/netbeans/"$2"' to "extension dir"
cp -r nbbuild/netbeans/"$2" "../$3"

cd "../$3"
mkdir -p $2
mv ./* $2
)
