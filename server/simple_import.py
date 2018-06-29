#!/usr/bin/env python
import os, subprocess, json
from eyesea_db import *

def importnxcode(dirr, outext = 'mp4', vcodec = 'libx264', vext = ['avi', 'mp4']):
    for f in os.listdir(dirr):
        if f.split('.')[-1] in vext:
            outfile = f.split('.')[0] + '.' + outext
            subprocess.check_output(['ffmpeg', '-i', dirr + f, '-an', '-vcodec', vcodec, dirr + outfile])
            data = video.select().where(video.vid==video.insert(filename = outfile, duration = 0, description = 'Import of' + dirr, fps = 25, variable_framerate = False, uri = 'file://' + dirr + outfile).execute()).dicts().get()
            print data
            for j in os.listdir(dirr):
                if j.split('.')[-1] == 'json' and f.split('.')[0] in j.split('.')[0]:
                    annot = json.loads(open(dirr+j).read())
                    analysis.select().where(analysis.aid==analysis.insert(vid = data['vid'], status = 'FINISHED', parameters = json.dumps(annot.copy().pop('frames', None)), results = json.dumps(annot['frames'])).execute()).dicts().get()
