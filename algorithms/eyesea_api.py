# eysesea_api.py
# Algorithm API for EyeSea application.
# 
import argparse # parse command line or config file
import os       # path name manipulations
import glob     # filename pattern matching
import json
import datetime

import cv2 # openCV for image processing

# XML for working with VOC format annotations
from lxml import etree as ET

# support reading frames from a VideoCapture object or from
# a directory of image files
'''
Option 1
if Python classes support inheritence and virtual classes,
then create virtual Input class and two derived classes, Stream and Images.
+supports streams, which could be movie or live camera
-

Option 2 
always use images
if input is a movie, then extract the frames
+ images are better quality
+ works with VOC annotation style of one file per image
+ best for training machine learning models
-need space for image data
-no direct support for live camera
-have to make into movie for eyesea app (current implementation)

Option 3
always use a Stream
if input is image dir, then make into movie with copy vcodec
+
-need space for movie file
-can't play copy vcodec in eyesea app (web requires mp4)
'''
# going with Option 2 

# GLOBAL VARS
# input directory that contains image files
eyesea_api_indir = []
# output directory where results will be saved
eyesea_api_outdir = []
# list of image files in input directory
eyesea_api_infiles = []
# shape of each image file, used in annotation file
eyesea_api_shapes = []
# total number of images (frames)
eyesea_api_nframes = []
# index of next image file (frame) to process
eyesea_api_nextf = 0
# results, see put_results()
eyesea_api_results = []

# parse command line arguments based on json file definitions
def get_args(jfile):
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="input to process")
    parser.add_argument("output", help="output file for results")

    
    if os.path.isfile(jfile):
        with open(jfile, 'r') as f:
            jsondata = json.load(f)
    else:
        eye_env = os.environ
        for i in eye_env['PATH'].split(os.pathsep):
            if os.path.isfile(i + os.sep + jfile):
                with open(i + os.sep + jfile, 'r') as f:
                    jsondata = json.load(f)
    
    for jarg in jsondata["parameters"]:
        parser.add_argument( jarg["arg"], 
            help=jarg["help"],
            default=jarg["default"],
            type=int if jarg["type"] == "int" else (float if jarg["type"] == "float" else str))

    parser.add_argument('--verbose', '-v', action='store_true')
    args = parser.parse_args()
    global eyesea_api_indir
    global eyesea_api_infiles
    global eyesea_api_nframes
    global eyesea_api_outdir
    global eyesea_api_results
    eyesea_api_indir = args.input

    print('processing input dir: ' + eyesea_api_indir)

    # try jpg first
    eyesea_api_infiles = sorted(glob.glob(os.path.join(eyesea_api_indir,'*.jpg')))
    if not eyesea_api_infiles:
        # try png
        eyesea_api_infiles = sorted(glob.glob(os.path.join(eyesea_api_indir,'*.png')))
    eyesea_api_nframes = len(eyesea_api_infiles)
    
    print('found {:d} frames'.format(eyesea_api_nframes))

    eyesea_api_results = [None] * eyesea_api_nframes

    # TODO: create output dir if it doesn't exist
    eyesea_api_outdir = args.output

    print('saving results to ' + eyesea_api_outdir)

    return args

# return next image as numpy array
# if no more images, returns empty array
def get_frame():
    global eyesea_api_nextf 
    global eyesea_api_infiles
    global eyesea_api_nframes
    global eyesea_api_shapes

    img = []
    idx = eyesea_api_nextf

    if eyesea_api_nextf < eyesea_api_nframes:
        imfile = eyesea_api_infiles[eyesea_api_nextf]
        img = cv2.imread(imfile,-1)
        # store size for later
        eyesea_api_shapes.append(img.shape) 
        eyesea_api_nextf += 1
    return img, idx

# class for storing bounding box
class bbox():
    def __init__(self, x1, y1, x2, y2):
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2

# Save the annotations in VOC XML format
# idx is the index of the frame returned by get_frame()
# detections is a list of bbox objects.
def put_results(idx, detections):
    annotation = ET.Element("annotation")
    ET.SubElement(annotation, "folder").text = os.path.split(eyesea_api_indir)[1]
    ET.SubElement(annotation, "filename").text = os.path.basename(eyesea_api_infiles[idx])
    ET.SubElement(annotation, "path").text = os.path.abspath(eyesea_api_infiles[idx])    
    source = ET.SubElement(annotation, "source")
    ET.SubElement(source, "database").text = 'Unknown'
    size = ET.SubElement(annotation, "size")
    ET.SubElement(size, "width").text = str(eyesea_api_shapes[idx][1])
    ET.SubElement(size, "height").text = str(eyesea_api_shapes[idx][0])
    if len(eyesea_api_shapes[idx]) > 2:
        ET.SubElement(size, "depth").text = str(eyesea_api_shapes[idx][2])
    else:
        ET.SubElement(size, "depth").text = "1"
    ET.SubElement(annotation, "segmented").text =str(0)
    for i in range(len(detections)):
        myobject = ET.SubElement(annotation, "object",name="detection"+str(i))
        ET.SubElement(myobject, "name").text = 'fish'
        ET.SubElement(myobject, "pose").text = 'unspecified'
        ET.SubElement(myobject, "truncated").text = str(0)
        ET.SubElement(myobject, "difficult").text = str(0)
        bndbox = ET.SubElement(myobject, "bndbox")
        ET.SubElement(bndbox, "xmin").text = str(min(detections[i].x1, detections[i].x2))
        ET.SubElement(bndbox, "ymin").text = str(min(detections[i].y1, detections[i].y2))
        ET.SubElement(bndbox, "xmax").text = str(max(detections[i].x1, detections[i].x2))
        ET.SubElement(bndbox, "ymax").text = str(max(detections[i].y1, detections[i].y2))
    tree = ET.ElementTree(annotation)
    outfile = "detections_{:d}.xml".format(idx)
    tree.write(outfile,  pretty_print=True)
    global eyesea_api_results
    eyesea_api_results[idx] = annotation
    return None

# LEGACY ANNOTATION SUPPORT
class Frame():
    def __init__(self, index, img, detections=list() ):
        self.frameindex = index #the frame index of image filename
        self.detections = detections #a list of bounding boxes
        self.img = img #a numpy array containing the pixel data
        
class Annotations():
    def __init__(self, videosource, user, frames=list(), last_edit=str(datetime.datetime.now())):
        self.source = videosource #the video this frame comes from
        self.user = user #last user to edit this file
        self.last_edit = last_edit
        self.frames = frames
                 
#This writes the annotations to a custom json file.
# annotations: an annotation object containing all of the bounding data
# out: a writable object, such as an open file handle
def annotations_to_json(annotations, output):
    output.write("{") # annotations
    output.write(" \"source\": \"" + annotations.source + "\",\n")
    output.write(" \"user\": \"" + annotations.user + "\",\n")
    output.write(" \"last_edit\": \"" + annotations.last_edit + "\",\n")
    output.write(" \"frames\": [\n") # frames
    
    frames = annotations.frames
    for i in range(len(frames)):
        output.write(" {\n") # frame
        output.write("  \"frameindex\": " + str(frames[i].frameindex) + ",\n")
        output.write("  \"detections\": [\n") # detections
        
        
        #for detection in frame.detections:
        detections = frames[i].detections
        for j in range(len(detections)):
            output.write("  {\n") # detection
            output.write("   \"x1\": " + str(detections[j].x1) + ",\n")
            output.write("   \"y1\": " + str(detections[j].y1) + ",\n")
            output.write("   \"x2\": " + str(detections[j].x2) + ",\n")
            output.write("   \"y2\": " + str(detections[j].y2) + "\n")
            output.write("  }")
            if (j < len(detections) -1 ):
                output.write(",\n") # /detection
            else:
                output.write("\n")
        output.write("  ]\n") # /detections
        output.write(" }")
        if (i < len(frames)-1):
            output.write(",\n")
        else:
            output.write("\n") # /frame
    output.write(" ]\n") # /frames
    
    output.write("}\n") # /annotations
        
        
def json_to_annotations(f):
    jsondata = json.load(f)
    
    frames = list()
    for jsonframe in jsondata["frames"]:
        detections = list()
        for jsondetection in jsonframe["detections"]:
            detections.append( BBox(jsondetection["x1"], jsondetection["y1"], jsondetection["x2"], jsondetection["y2"]) )
        frames.append(Frame(jsonframe["frameindex"], None, detections ) )
    
    annotations = Annotations(jsondata["source"], jsondata["user"], frames, jsondata["last_edit"])
    
    return annotations

# save_results() translates from common object
# detection file formats into eyesea json format
def save_results():
    global eyesea_api_outdir
    outfile = os.path.join(eyesea_api_outdir, 'results.json')
    print("save_results() not implemented")
    #with open(outfile,'w') as f:
        #json.dump(results,f)
        #annotations_to_json(results, f)

if __name__ == "__main__":
    print("testing eysea_api")
    # TODO:  add tests
    args = get_args('algorithm.json.example')
