import sys
import numpy.core.multiarray
import cv2
import json
import numpy
import datetime
import os


class BBox():
	def __init__(self, x1, y1, x2, y2):
		self.x1 = x1
		self.y1 = y1
		self.x2 = x2
		self.y2 = y2

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
		
def boundaryCheck(bbox, img):
	#points are (x, y) and shape returns (row, col) so the indices are different
	if (bbox.x1 > img.shape[1]):
		bbox.x1 = img.shape[1]
	if (bbox.x2 > img.shape[1]):
		bbox.x2 = img.shape[1]
		
	if (bbox.x1 < 0):
		bbox.x1 = 0
	if (bbox.x2 < 0):
		bbox.x2 = 0
		
	if (bbox.y1 > img.shape[0]):
		bbox.y1 = img.shape[0]
	if (bbox.y2 > img.shape[0]):
		bbox.y2 = img.shape[0]
		
	if (bbox.y1 < 0):
		bbox.y1 = 0
	if (bbox.y2 < 0):
		bbox.y2 = 0


def draw_points(image, detections):
	
	for detection in detections:
		#cv2.rectangle(image, detection.pt1, detection.pt2, (255, 255, 255))
		cv2.rectangle(image, (detection.x1, detection.y1), 
					(detection.x2, detection.y2), (0,0,255))

	cv2.imshow("image", image);


def onMouse( event, x, y, flags, param):
	global clicked
	global currentbox
	global frameindex
	global annotations
	global image
	
	if event == cv2.EVENT_LBUTTONDOWN:
		clicked = True;
		
		currentbox.x1 = x
		currentbox.y1 = y
		currentbox.x2 = x
		currentbox.y2 = y
		
		
	elif event==cv2.EVENT_LBUTTONUP:
		clicked = False;
		
		#currentbox.pt2 = Point(x, y);
		currentbox.x2 = x
		currentbox.y2 = y
		
		
		boundaryCheck(currentbox, image);
		
		if (currentbox.x1 != currentbox.x2 and currentbox.y1 != currentbox.y2):
			#button up and mouse moved, so assume this is an accurate bounding box.
			clone = BBox(currentbox.x1, currentbox.y1, currentbox.x2, currentbox.y2)
			annotations.frames[frameindex].detections.append(clone)
		
		temp = image.copy();
		draw_points(temp, annotations.frames[frameindex].detections);
		cv2.imshow("image", temp);
		
		
	elif event==cv2.EVENT_MOUSEMOVE:
		if (clicked == True):
			currentbox.x2 = x
			currentbox.y2 = y
			boundaryCheck(currentbox, image);
		
			if (currentbox.x1 != currentbox.x2 and currentbox.y1 != currentbox.y2):
				temp = image.copy();
				cv2.rectangle(temp, (currentbox.x1, currentbox.y1), 
					(currentbox.x2, currentbox.y2), (255,255,255))
				
				cv2.imshow("image", temp);
			
			
			
			
def onTrackbar(value):
	global frameindex
	frameindex = value
	goToFrame(frameindex)

def getTotalFrames(video):
	print("Loading video file: " + video)
	cap = cv2.VideoCapture(video)
	length = 0
	ret, img = cap.read()
	if (not ret):
		print("Error: could not read video frames")
		sys.exit()
	while (ret):
		length = length + 1
		ret, img = cap.read()
	cap.release()
	return length
	
	
def goToFrame(index):
	global annotations
	global image
	global cap
	global totalframes
	
	#stepping backward to a frame already processed
	if (len(annotations.frames) > index and index >= 0):
		#print("preexisting")
		image = annotations.frames[index].img.copy()
		
	#stepping forward
	elif (len(annotations.frames) <= index and index < totalframes):
		#print("new")
		for i in range(len(annotations.frames), index+1):
			newindex = len(annotations.frames)
			ret, image = cap.read()
			nextFrame = Frame(newindex, image.copy(), list())
			annotations.frames.append(nextFrame)
	
	elif (index > totalframes):
		print("Warning: requested index is beyond the final frame.")
	elif (index < 0): 
		print("Warning: requested index is negative.")
		
	draw_points(image, annotations.frames[index].detections)
			
def print_help():
	print("\nKeyboard Commands:\n")
	print(" <Space>      ->    advance to next frame")
	print(" <Backspace>  ->    return to previous frame")
	print(" <r>          ->    rewind to first frame")
	print(" <d>          ->    delete the last bounding box")
	print(" <c>          ->    copy all bounding boxes from previous frame")
	print(" <ESC>        ->    save all changes to the output file")
	print(" <CTRL+X>     ->    exit without saving any changes")			

def annotate():
	global cap
	global clicked
	global currentbox
	global frameindex
	global annotations
	global image
	global totalframes

	import argparse
    
	# construct the argument parser and parse the arguments
	ap = argparse.ArgumentParser()
	ap.add_argument("-i", "--input", required=True, help="input video file name")
	ap.add_argument("-o", "--output", required=False, help="output json file name")
	ap.add_argument("-u", "--user", required=False, help="a username or other identifier to track who last edited the file")
	ap.add_argument("-j", "--json", required=False, help="if specified, load and edit an existing json boundaries file.")
	ap.add_argument("--overwrite", action='store_true', help="if an output file with this name already exists, only overwrite if this flag is set.")
	ap.add_argument("--edit", action='store_true', help="use to load an existing set of annotations. Defaults to the output file but can be specified with --json. If default is used, changes will overwrite the existing file.")
	args = vars(ap.parse_args())

	if (args["output"]):
		jsonout = args["output"]
	else:
		jsonout = os.path.splitext(args["input"])[0]+".json"
		
	if (os.path.exists(jsonout) and not args["overwrite"] and not args["edit"]):
		print("Error: output file already exists. Specify a different file path with the -o option, edit an existing file with --edit, or allow overwrite with --overwrite")
		sys.exit(1)
	
	if (args["overwrite"]):
		print("Caution! Saving annotations to this file will completely overwrite the existing file! If this is not desired, use Ctrl+x to exit without making changes.")
	
	#if (args["overwrite"] and not os.path.exists(jsonout)):
	#	print("Warning: overwrite selected but previous json file not found")

	if (args["user"]):
		user = args["user"]
	else:
		user = os.getlogin()

	#OpenCV provides a handle to a frame count property, but it is not a required attribute in video
	#files and so it is unreliable. Step through the frames to get a count instead. 
	#TODO: improve efficiency by preloading all frames during this step or at least combine the
	#       json loading.
	totalframes = getTotalFrames(args["input"])
	print("Frame count: " + str(totalframes))

	#load up the video file so we can repopulate the images if json is passed in.
	cap = cv2.VideoCapture(args["input"])
	cv2.namedWindow("image", cv2.WINDOW_NORMAL)
	cv2.setMouseCallback( "image", onMouse, 0 );
	#trackbar limits are inclusive at both ends, so trim the length by 1
	cv2.createTrackbar("Frame select", "image", 0, totalframes-1, onTrackbar)

	# A json input means we've done some work with this file before. 
	# Restore the data structure to its previous state by rebuilding
	# the bounding boxes and reloading the images from the source file.
	if (args["edit"]):
		if (args["json"]):
			jsonin = args["json"]
		else:
			jsonin = jsonout
		print("Loading annotations file: " + jsonin)
		if (args["edit"] and not os.path.exists(jsonin)):
			print("Error: JSON annotations file not found.")
			sys.exit(1)
			
		with open(jsonin, 'rb') as f:
			annotations = json_to_annotations(f)
			
		for frame in annotations.frames:
			ret, image = cap.read()
			if (ret == False):
				print("Error, could not get frame from video.")
				sys.exit()
			else:
				frame.img = image.copy()
				frameindex = frame.frameindex
		cv2.setTrackbarPos("Frame select", "image", frameindex)
		if (len(annotations.frames[frameindex].detections) > 0):
			
			draw_points(image, annotations.frames[frameindex].detections)
	# No json file means we get to start fresh which is easy.
	else:
		annotations = Annotations(args["input"], user)
		
		#get the first frame to make sure the video input is valid and to
		#give the viewing window something to display.
		ret, image = cap.read()

		if (ret == False):
			print("Error, could not get frame from video.")
			sys.exit()
			
		newframe = Frame(0, image.copy(), list())
		annotations.frames.append(newframe)
		frameindex = 0

	currentbox = BBox(0, 0, 0, 0)
	clicked = False
	c=0
	print_help()
	#updateDisplay = True
	#if (updateDisplay):
	cv2.imshow("image",  image );
	#updateDisplay = False
	
	while(True):
		print("Current frame: " + str(frameindex))
		print("# of detections: " + str(len(annotations.frames[frameindex].detections)))



			
		previousbutton = c;
		c = cv2.waitKey(0);
		if( (c & 255) == 27 or (c & 255) == 255):  #ESC, save and exit gracefully
			

			jsonoutfile = open(jsonout, 'w')
			annotations_to_json(annotations, jsonoutfile)
			jsonoutfile.close()
			
			break
			
		elif ( (c & 255) == 32): #space, advance to next frame
			
			if (frameindex + 1 < totalframes):
				
				print("Advancing to the next frame ... ")
				frameindex = frameindex + 1
				cv2.setTrackbarPos("Frame select", "image", frameindex)
				#updateDisplay = True #no need to update here, because trackbar changes update it
				cv2.waitKey(10)
			
		elif ( (c & 255) == 8): #backspace, return to previous frame
		
			if (frameindex > 0):
				print("Returning to previous frame ... ")
				frameindex = frameindex - 1
				cv2.setTrackbarPos("Frame select", "image", frameindex)
				#updateDisplay = True #no need to update here, because trackbar changes update it
				
		elif ( (c & 255) == 120 and (previousbutton & 255) == 227): #CTRL+X, exit immediately and without saving any changes
		
			print("Exiting without saving... ");
			break
		

		elif (chr(c & 255) == 'r'): #r, go back to the first frame
			print("Go back to the first image")
			image = annotations.frames[0].img.copy()
			frameindex = 0
			draw_points(image, annotations.frames[frameindex].detections)
			cv2.setTrackbarPos("Frame select", "image", 0)
			
		elif (chr(c & 255) == 'd'): #d, delete the last bounding box
			
			if (len(annotations.frames[frameindex].detections) > 0):
				print("Deleting previous box.")
				del annotations.frames[frameindex].detections[-1]
				image = annotations.frames[frameindex].img.copy()
					
				draw_points(image, annotations.frames[frameindex].detections);
			else:
				print("No selections to delete")
				
		elif (chr(c & 255) == 'c'): #c, copy all of the bounding boxes from the previous frame
			
			if (frameindex > 0):
				print("Copying points from previous frame.")
				for i in range(len(annotations.frames[frameindex-1].detections)):
				
					#TODO check to make sure that removing the detection in one of the frames doesn't remove it in the other
					annotations.frames[frameindex].detections.append(annotations.frames[frameindex-1].detections[i]);
				
				draw_points(image, annotations.frames[frameindex].detections);
			
			else:
				print("At first frame. No previous points to copy")


		else: #something else: do nothing
			print("key pressed is: " + str(c & 255))
			
			print_help()

if __name__ == "__main__":
	print(cv2.__version__)
	annotate()

