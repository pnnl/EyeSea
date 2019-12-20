'''
Copyright 2018 Battelle Memorial Institute. All rights reserved.
'''
# algorithm.py.example

import eyesea_api as api
import random

# set the name of the algorithm
algname = "example"
# get parameter settings
args = api.get_args('algorithm_example.json')

# process data
results = api.Annotations(args.input, algname)
frame_idx = 0
frame = api.get_frame()
# width of frame
W = frame.shape[1]
# height of frame
H = frame.shape[0]
print('width = {:d}, height = {:d}'.format(W,H))
while  frame != []  :
    print(frame_idx)
    results.frames.append(api.Frame(frame_idx,[],list()))

    # detect fish -- replace the lines below with your clever detection scheme
    w = random.randint(2,42)
    h = random.randint(2,42)
    x = random.randint(0, W-w)
    y = random.randint(0, H-h)

    results.frames[frame_idx].detections.append(api.BBox(x,y,x+w,y+h))

    frame = api.get_frame()
    frame_idx += 1

# save results
print('processed {:d} frames'.format(frame_idx))
api.save_results(results)