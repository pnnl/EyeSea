'''
Copyright 2018 Battelle Memorial Institute. All rights reserved.
'''
# manual annotation

import eyesea_api as api
import cv2

# set the name of the algorithm
algname = "manual"
print("")
print("algname is " + algname)
# get parameter settings
args = api.get_args('manual.json')
print(args)
# process video
results = api.Annotations(args.vidfile, algname)
frame_idx = 0
cap = cv2.VideoCapture(args.vidfile)
ok, frame = cap.read()
# width of frame
W = frame.shape[1]
# height of frame
H = frame.shape[0]
# don't do anthing except create an output file.
while(ok):
    results.frames.append(api.Frame(frame_idx,[],list()))
    ok, frame = cap.read()
    frame_idx += 1
# save results
print("saving results to " + args.outfile)
api.save_results(results,args.outfile)