#!/bin/bash
# requires jq for parsing jason files
# https://stedolan.github.io/jq/download/

EYESEA_ROOT=$HOME/EyeSea
CONDA_BASE=$(conda info --base)
source $CONDA_BASE/etc/profile.d/conda.sh

# TODO: The following line doesn't work. jq returns the path with quotes around it and find doesn't like it
#EYESEA_DB_PATH=`cat $EYESEA_ROOT/server/eyesea_settings.json | jq '.database_storage' | envsubst`
EYESEA_DB_PATH=$HOME/databases

# read list of databases
echo ' '
echo 'path for database files: ' $EYESEA_DB_PATH 
echo ' '

# stash original settings file, in case something goes wrong
cp eyesea_settings.json eyesea_settings.json.saved

# display list 
PS3="Select a dataset: "
#select newdb in $EYESEA_DB_PATH/*.db quit
COLUMNS=0
select newdb in $(find $EYESEA_DB_PATH -maxdepth 1 -name "*.db" | sort | tail -10 | awk -F/ '{print $NF}' ) quit
do
    case $newdb in
        quit)
            break
            ;;
        *)
            echo $newdb
            # update settings
            cat eyesea_settings.json | jq --arg NEWDB "$newdb" '.database |= $NEWDB' > temp.json
            cp temp.json eyesea_settings.json
            # kill server
            kill -9 $(ps aux | grep '[p]ython eyesea_server.py' | awk '{print $2}')
            # start server
            conda activate eyesea-server
            nohup python eyesea_server.py >/dev/null 2>$HOME/eyesea.log &
    esac
done




