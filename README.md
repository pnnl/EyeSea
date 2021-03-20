# Welcome to EyeSea!
# Install EyeSea

## Get the source
Clone  or download the project from 
https://github.com/pnnl/EyeSea.git


## Set up environment
Install [conda](https://docs.conda.io/en/latest/miniconda.html) for managing environments.
Then install install dependencies:
### client
```
cd $EYESEA_ROOT/uclient
conda env create -f env-eyesea-client.yml
```
This will install  [node](https://nodejs.org/en/)  in your system.

Then use npm to install the dependencies:
```
npm install -g yarn
```
```
yarn install
```

### server

```
cd $EYESEA_ROOT/server
conda env create -f env-eyesea-server.yml
``````

# Run EyeSea 

Start the server and client:
```
$EYESEA_ROOT/eyesea.sh 
```
Open your web browser to `http://localhost:7890/`

# Use EyeSea

1. Add a video.
2. Select an algorithm to use for detection. One algorithm bgMOG2 is included.  You can add new algorithms (see below).
3. View the results by clicking on the video thumbnail.  
4. Play the video with detections overlayed.  Add/delete detections.
5. View a summary of the results.
6. Download all the detections into a csv file for further analysis. 

# Adding New Algorithms

New algorithms for detection can be added to EyeSea via the API -- see algorithms/eyesea_api.py and algorithm/algorithm_example.*

# Integration with StereoVision

The EyeSea software can be configured to automatically ingest data recorded by the StereoVision system developed by [Marine Situ](https://www.marinesitu.com/).  See server/stereovison_ingest.py.  

# Known Issues

1. The included detection algorithm bgMOG2 may or may not work on your dataset. You may need to tune the parameters on your data to achieve the right trade-off between detection rate and false positive rate.  You may need to develop your own custom detection algorithm.

2.a. The software can only handle a dataset of about 20 videos at a time.  To work with larger datasets, divide the data into "days" or some other grouping that makes sense for you.  Only one dataset will be visible in EyeSea at any one time.  In order to change the dataset, you will need to edit /home/eyesea/EyeSea/server/eyesea_settings.json and change the “database” entry to the database for the dataset you want to view.

2.b. There is a script /home/eyesea/EyeSea/server/select_db.sh that will generate a list of all the databases (datasets) that have been ingested (see "Integration with StereoVision" above for how to ingest data).  The script will automatically edit the settings file and attempt to restart the server, however the restart fails.  So the workaround is to run /home/eyesea/EyeSea/server/select_db.sh, select the database, then run /home/eyesea/EyeSea/eyesea.sh to restart the software.

<!--stackedit_data:
eyJoaXN0b3J5IjpbNjcxNzYzNzUzLDEwODM3MzY1NDksLTY5Mz
MzMzkzMV19
-->

