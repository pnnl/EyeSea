# eysesea_api.py
# Author: Shari Matzner
# Last updated: 2018-08-31
# Description: Algorithm API for EyeSea application.
# 

import argparse
import os
import json


# parse command line arguments based on json file definitions
def get_args(jfile):
    parser = argparse.ArgumentParser()
    parser.add_argument("vidfile", help="video file to process")
    parser.add_argument("outfile", help="output file for results")

    with open(jfile, 'r') as f:
        jsondata = json.load(f)
    # TODO: support type= type from json file

    for jarg in jsondata["parameters"]:
        parser.add_argument( jarg["arg"], 
            help=jarg["help"],
            default=jarg["default"])

    parser.add_argument('--verbose', '-v', action='store_true')

    return parser.parse_args()

# save_results() translates from common object
# detection file formats into eyesea json format
def save_results(results, outfile):
    with open(outfile,'w') as f:
        json.dump(results,f)

# TODO:  add structure/class for eyesea json format

if __name__ == "__main__":
    print("testing eysea_api")
    # TODO:  add tests
    args = get_args('algorithm.json.example')
