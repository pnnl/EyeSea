'''
Copyright 2018 Battelle Memorial Institute. All rights reserved.
'''
# algorithm.py.example

import eyesea_api as api
import random

# get parameter settings
args = api.get_args('algorithm_example.json')

# process data
# get a frame 
frame, idx = api.get_frame()
# width of frame
W = frame.shape[1]
# height of frame
H = frame.shape[0]
print('width = {:d}, height = {:d}'.format(W,H))

# process the frames
while  frame != []  :
    print('processing frame {:d}'.format(idx))
    detections = []

    # detect fish -- replace the lines below with your clever detection scheme
    numfish = random.randint(0,12)
    for f in range(numfish):
        w = random.randint(2,W/2)
        h = random.randint(2,H/2)
        x = random.randint(0, W-w)
        y = random.randint(0, H-h)
        detections.append(api.bbox(x,y,x+w,y+h))

    api.put_results(idx, detections)
    if args.xml: api.put_results_xml(idx, detections)
    
    frame, idx = api.get_frame()

# save results
print('processed {:d} frames'.format(idx))
api.save_results()