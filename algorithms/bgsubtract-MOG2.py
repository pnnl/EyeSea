#!/usr/bin/env python
# background subtraction
'''
Copyright 2018 Battelle Memorial Institute. All rights reserved.
'''

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

Default params work ok but lots of false positives from video compression 
artifacts, bubbles. Bounding boxes for fish seem oversized, multiple fish 
are in one box. Using a larger morph element (5x5) reduced false positives. 
"""
import argparse
import os
import numpy as np
import cv2
import json
#import imutils

import eyesea_api as api


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
    args = api.get_args('bgsubtract-MOG2.json')
    
    if args.verbose: print("Welcome to " + alg_name + "!")

    # kernel used for morphological ops on fg mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(args.kw,args.kh))
    fgbg = cv2.createBackgroundSubtractorMOG2(history=args.history, varThreshold=args.varThreshold, detectShadows=False)

    annotations = api.Annotations(args.input, alg_name)
    frame_idx = 0
    frame, imfile = api.get_frame()
    while(frame != []):
        annotations.frames.append(api.Frame(frame_idx,[],list()))
        # fgmask is single channel 2D array of type uint8
        # NOTE: setting the learningRate increased false positives
        #fgmask = fgbg.apply(frame, learningRate=0.001)
        fgmask = fgbg.apply(frame)
        # BAD -- don't do the following
        #fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_CLOSE, kernel)
        fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_OPEN, kernel)
        cnts = cv2.findContours(fgmask.copy(), cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        # https://stackoverflow.com/questions/54734538/opencv-assertion-failed-215assertion-failed-npoints-0-depth-cv-32
        contours = cnts[1] #if imutils.is_cv3() else cnts[0] # simplify reference
        if args.verbose: print(os.path.basename(imfile) + "  {:d} blobs".format(len(contours)))
        
        for c in contours:
            (x, y, w, h) = cv2.boundingRect(c)
            if args.verbose: print("  {:d},{:d},{:d},{:d}".format(x,y,w,h))
            if w > 3 and h > 3:
                annotations.frames[frame_idx].detections.append(api.BBox(x,y,x+w,y+h))
                cv2.rectangle(frame,(int(x),int(y)),(int(x+w),int(y+h)),(0,0,255),2)
        if args.verbose: 
            cv2.imshow('frame',frame)
            k = cv2.waitKey(500) & 0xff
            if k == 27:
                break
        frame, imfile = api.get_frame()
        frame_idx += 1
 
    cv2.destroyAllWindows()
    if args.verbose: print("processed {:d} frames".format(frame_idx)) 
  
    # make output directory, if it doesn't exist
    api.save_results(annotations)

if __name__ == "__main__":
    algorithm()
