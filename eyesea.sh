#!/bin/bash

# run the eyesea server and client
EYESEA_ROOT=$HOME/eyesea
CONDA_BASE=$(conda info --base)
source $CONDA_BASE/etc/profile.d/conda.sh

cd $EYESEA_ROOT/server
conda activate eyesea-server
nohup python eyesea_server.py >/dev/null 2>&1 &

cd $EYESEA_ROOT/uclient
conda activate eyesea-client
nohup yarn start >/dev/null 2>&1 &
