#!/usr/bin/env python
# background subtraction
"""
https://ieeexplore.ieee.org/abstract/document/1333992/
https://www.sciencedirect.com/science/article/pii/S0167865505003521
Efficient adaptive density estimation per image pixel for the task of background subtraction
Zivkovic and Heijden 2006

Default parameter values in openCV implementation:
    backgroundRatio = 0.900000
    ComplexityReductionThreshold = 0.050000
    DetectShadows = 1
    History = 500.000000
    NMixtures = 5.000000
    ShadowThreshold = 0.500000
    ShadowValue = 127.000000
    VarInit = 15.000000
    VarMax = 75.000000
    VarMin = 4.000000
    VarThreshold = 16.000000
    VarThresholdGen = 9.000000

NOTE: There is also a learningRate parameter for the apply() method.
      The default value is ?  It corresponds to alpha in paper:
      "the constant alpha defines an exponentially decaying envelope 
      that is used to limit the influence of the old data."

Default params work ok on orpc_adult_then_smolts, not so good on 
voith.  Some fish are detected by lots of false positives from 
vertical line artifacts. On wells, spurious false positives, maybe bubbles or
reflections in the glass? Bounding boxes for fish seem oversized, multiple fish 
are in one box. Using a larger morph element (5x5) reduced false positives. Even
with shadow detection on (which I assume is supposed to recognize shadows and 
not consider fg), shadow of fish is detected.
"""
import argparse
import os
import numpy as np
import cv2
import json

import annotator as ann

def parse_all_args():
    
    parser = argparse.ArgumentParser()
    # required arguments for eyesea framework
    parser.add_argument("--videofile", help="video file to process (required)")
    parser.add_argument("--outputfile", help="file to save output (required)")
    parser.add_argument("--detectShadows", help="detect shadows 1 to enable, 0 to disable [default 1]", type=int, default=1)
    parser.add_argument("--history", help="length of history [default 500]", type=int, default=500)
    parser.add_argument("--varThreshold", help="threshold on the squared distance between the pixel and the sample to decide whether a pixel is close to that sample. [default 16]", type=int, default=16)
    # optional algorithm-specific arguments1
    parser.add_argument("--kw", help="kernel width for morph ops [default = 3]",
        type=int, default=3)
    parser.add_argument("--kh", help="kernel height for morph ops [default = 3]",
        type=int, default=3)
    return parser.parse_args()

def print_params(mog2):
    '''
    getBackgroundImage()
    getBackgroundRatio() 
    getComplexityReductionThreshold()
    getDefaultName() 
    getDetectShadows() 
    getHistory() 
    getNMixtures() 
    getShadowThreshold()
    getShadowValue() 
    getVarInit() 
    getVarMax() 
    getVarMin() 
    getVarThreshold() 
    getVarThresholdGen()
    '''
    print("backgroundRatio = {:f}".format(mog2.getBackgroundRatio()))
    print("ComplexityReductionThreshold = {:f}".format(mog2.getComplexityReductionThreshold()))
    print("DetectShadows = {:d}".format(mog2.getDetectShadows() ))
    print("History = {:d}".format(mog2.getHistory() ))
    print("NMixtures = {:d}".format(mog2.getNMixtures() ))
    print("ShadowThreshold = {:f}".format(mog2.getShadowThreshold()))
    print("ShadowValue = {:d}".format(mog2.getShadowValue() ))
    print("VarInit = {:f}".format(mog2.getVarInit() ))
    print("VarMax = {:f}".format(mog2.getVarMax() ))
    print("VarMin = {:f}".format(mog2.getVarMin() ))
    print("VarThreshold = {:f}".format(mog2.getVarThreshold() ))
    print("VarThresholdGen = {:f}".format(mog2.getVarThresholdGen()))


# main algorithm
def algorithm():
    alg_name = "bgMOG2" # give it a short descriptive name

    print("Welcome to " + alg_name + "!")

    args = parse_all_args()
    print("videofile = " + args.videofile)
    print("outputfile = " + args.outputfile)

    # check video file exists and is readable
    print("processing " + args.videofile)

    cap = cv2.VideoCapture(args.videofile)

    # kernel used for morphological ops on fg mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(args.kw,args.kh))
    fgbg = cv2.createBackgroundSubtractorMOG2(history=args.history, varThreshold=args.varThreshold, detectShadows=args.detectShadows)
    
    #fgbg.setDetectShadows(0)
    print_params(fgbg)

    annotations = ann.Annotations(args.videofile, alg_name)

    frame_idx = 0
    ok, frame = cap.read()
    while(ok):
        annotations.frames.append(ann.Frame(frame_idx,[],list()))
        # fgmask is single channel 2D array of type uint8
        # NOTE: setting the learningRate below introduced false positives
        #fgmask = fgbg.apply(frame, learningRate=0.001)
        fgmask = fgbg.apply(frame)
        # BAD
        #fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_CLOSE, kernel)
        fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_OPEN, kernel)
        cnts = cv2.findContours(fgmask.copy(), cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        cnts = cnts[1] # simplify reference
        print("{:d} blobs".format(len(cnts)))
        #fgc = cv2.cvtColor(fgmask, cv2.COLOR_GRAY2BGR)
        for c in cnts:
            (x, y, w, h) = cv2.boundingRect(c)
            print("  {:d},{:d},{:d},{:d}".format(x,y,w,h))
            if w > 3 and h > 3:
                annotations.frames[frame_idx].detections.append(ann.BBox(x,y,x+w,y+h))
                cv2.rectangle(frame,(int(x),int(y)),(int(x+w),int(y+h)),(0,0,255),2)
        cv2.imshow('frame',frame)
        k = cv2.waitKey(100) & 0xff
        if k == 27:
            break
        ok, frame = cap.read()
        frame_idx += 1
 
    cap.release()
    cv2.destroyAllWindows()
    print("processed {:d} frames".format(frame_idx))
    # make output directory, if it doesn't exist

  
    print("saving results to " + args.outputfile)
    with open(args.outputfile,'w') as outfile:
            ann.annotations_to_json(annotations, outfile)

if __name__ == "__main__":
    algorithm()
