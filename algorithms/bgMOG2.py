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
#import argparse
import os
import numpy as np
import cv2

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
def bgMOG2():
    args = api.get_args('bgMOG2.json')
    
    if args.verbose: print("Welcome to bgMOG2!")

    # kernel used for morphological ops on fg mask
    # NOTE: larger values for kernel size really slow computation
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,6))
    fgbg = cv2.createBackgroundSubtractorMOG2(
        history=args.history, 
        varThreshold=args.varThreshold, 
        detectShadows=False)
    if args.verbose: 
        print("")
        print("-----------MOG2 Parameters-----------")
        print_params(fgbg)
        print("-------------------------------------")
        print("")

    # process data
    # get a frame 
    frame, idx = api.get_frame()
    if len(frame.shape) > 2:
        depth = frame.shape[2]
    else:
        depth = 1

    detections = []
    while(frame != []):
        # convert to grayscale, if frame is color image
        if depth > 1: 
            frame = np.float32(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)) / 255.0

        # fgmask is single channel 2D array of type uint8
        # NOTE: setting the learningRate increased false positives
        #fgmask = fgbg.apply(frame, learningRate=0.001)
        fgmask = fgbg.apply(frame)
        # apply morphological open to remove small isolated groups of fg pixels
        fgmask = cv2.morphologyEx(fgmask, cv2.MORPH_OPEN, kernel)
        cnts = cv2.findContours(fgmask.copy(), cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        # https://stackoverflow.com/questions/54734538/opencv-assertion-failed-215assertion-failed-npoints-0-depth-cv-32
        contours = cnts[1] # simplify reference
        #print(cnts)
        if args.verbose: 
            print(os.path.basename(api.framefilepath(idx)) + "  {:d} blobs".format(len(contours)))
        
        for c in contours:
            #print(c)
            (x, y, w, h) = cv2.boundingRect(c)
            if args.verbose: print("  {:d},{:d},{:d},{:d}".format(x,y,w,h))
            if w > args.minw and w < args.maxw and h > args.minh and h < args.maxh:
                detections.append(api.bbox(x,y,x+w,y+h))
                cv2.rectangle(frame,(int(x),int(y)),(int(x+w),int(y+h)),(0,0,255),2)
        if args.verbose: 
            dst = cv2.resize(frame, None, fx = 0.5, fy = 0.5, interpolation = cv2.INTER_AREA)
            cv2.imshow('frame',dst)
            k = cv2.waitKey(500) & 0xff
            if k == 27:
                break
        api.put_results(idx, detections)
        if args.xml: api.put_results_xml(idx, detections)
        frame, idx = api.get_frame()
 
    cv2.destroyAllWindows()
    if args.verbose: print("processed {:d} frames".format(idx)) 
  
    # save the results 
    api.save_results()

if __name__ == "__main__":
    bgMOG2()
