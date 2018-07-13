#!/usr/bin/env python2
import json
import bottle
import os
import re
import subprocess
import base64
import time

import numpy as np
from numpy import inf
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from mpl_toolkits.axes_grid1 import make_axes_locatable

from PIL import Image
from subprocess import check_output, Popen, PIPE
from bottle import request, response, post, get, put, delete, hook, route, static_file
from eyesea_db import *
from peewee import fn

settings = json.loads(open("eyesea_settings.json").read())

cache = settings["cache"]
if not os.path.isdir(cache):
    os.mkdir(cache)

videostore = settings["video_storage"]
if not os.path.isdir(videostore):
    os.mkdir(videostore)

tmp = settings["temporary_storage"]
if not os.path.isdir(tmp):
    os.mkdir(tmp)
else:
    for i in os.listdir(tmp):
        os.remove(os.path.join(tmp,i))

vformat = settings["video_format"]
vcodec = settings["ffmpeg_vcodec"]
    
eye_env = os.environ
eye_env["PATH"] = os.path.abspath(settings["algorithm_bin"]) + os.pathsep + eye_env["PATH"]
tasklist = {}

def scanmethods():
    methods = analysis_method.select().dicts()
    for i in eye_env["PATH"].split(os.pathsep):
        for j in os.listdir(i):
            name, ext = os.path.splitext(j)
            if ext == '.json':
                fdict = json.loads(open(os.path.abspath(i) + os.sep + j).read())
                fjson = json.dumps(fdict) #normalize json
                found = False
                for k in methods:
                    if 'name' in fdict:
                        if k['parameters'] == fjson:
                            found = True
                if found == False and 'name' in fdict:
                    analysis_method.insert({'description' : fdict['name'], 'parameters' : fjson, 'creation_date' : int(time.time()), 'results' : ''}).execute()
                    methods = analysis_method.select().dicts()

scanmethods()

@route('/', method = 'OPTIONS')
@route('/<path:path>', method = 'OPTIONS')
def options_handler(path = None):
    return

def fr():
    hdr = request.get_header('Content-Type')
    if hdr == None:
        return lambda x: x
    elif hdr.lower() == 'text/plain':
        return lambda x: x
    elif hdr.lower() == 'application/json':
        return json.dumps
    else:
        return lambda x: "Unknown request header: " + hdr

@hook('before_request')
def br():
    db.connect(reuse_if_open=True)

def allow_cross_origin(resp):
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'PUT, GET, POST, DELETE, OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token'

@hook('after_request')
def ar():
    db.close()
    allow_cross_origin(response)

@get('/statistics')
def get_statistics():
    data = analysis.select(analysis.status, fn.COUNT(analysis.status).alias('count')).group_by(analysis.status).dicts()
    counts = dict()
    for i in data:
        counts[i['status']] = i['count']
    data = {'total_videos' : len(video.select()),
            'total_analyses' : len(analysis.select()),
            'total_analyses_completed' : counts['FINISHED'] if 'FINISHED' in counts else 0,
            'total_analyses_failed' : counts['FAILED'] if 'FAILED' in counts else 0,
            'total_analyses_processing' : counts['PROCESSING'] if 'PROCESSING' in counts else 0,
            'total_analyses_queued' : counts['QUEUED'] if 'QUEUED' in counts else 0
            }
    return fr()(data)

@get('/video')
def get_video():
    data = video.select(video).dicts()

    data = [(lambda vid: {
        'id': vid['vid'],
        'filename': vid['filename'],
        'description': vid['description'],
        'fps': vid['fps'],
        'variableFramerate': vid['variable_framerate'],
        'duration': vid['duration'],
        'uri': vid['uri'],
        'analyses': [(lambda analysis, results: {
            'id': analysis['aid'],
            'status': analysis['status'],
            'method': analysis['mid'],
            'results': [
                {
                    'detections': frame['detections'],
                    'frameIndex': frame['frameindex']
                } for frame in results
            ]
        })(i, json.loads(i['results'] if i['results'] else '{}')) for i in analysis.select(analysis).where(analysis.vid == vid['vid']).dicts()]
    })(i) for i in data]
    return fr()(data)

@post('/video')
def post_video():
    upload = request.json['upload']
    name, ext = os.path.splitext(request.json['filename'])
    if ext != vformat:
        file_path = "{p}/{f}".format(p=tmp, f=request.json['filename'])
        with open(file_path, 'wb') as f:
            f.write(upload.decode('base64'))
        subprocess.check_output(['ffmpeg', '-y', '-i', file_path, '-an', '-vcodec', vcodec, videostore + '/' + name + '.' + vformat])
    else:
        file_path = "{p}/{f}".format(p=videostore, f=request.json['filename'])
        with open(file_path, 'wb') as f:
            f.write(upload.decode('base64'))

    dbdata = request.json.copy()
    dbdata.pop('upload')
    data = video.select().where(video.vid==video.insert(dbdata).execute()).dicts().get()
    return fr()(data)

@get('/video/<vid>')
def get_video_vid(vid):
    data = video.select().where(video.vid == vid).dicts().get();

    data = {
        'id': data['vid'],
        'filename': data['filename'],
        'description': data['description'],
        'fps': data['fps'],
        'variableFramerate': data['variable_framerate'],
        'duration': data['duration'],
        'uri': data['uri'],
        'analyses': [(lambda analysis, results: {
            'id': analysis['aid'],
            'status': analysis['status'],
            'method': analysis['mid'],
            'results': [
                {
                    'detections': frame['detections'],
                    'frameIndex': frame['frameindex']
                } for frame in results
            ]
        })(i, json.loads(i['results'] if i['results'] else '{}')) for i in analysis.select(analysis).where(analysis.vid == vid).dicts()]
    }
    return fr()(data)

drive_letter = re.compile('/[a-zA-Z]:')

@route('/video/<vid>/file')
def server_static(vid):
    uri = video.select().where(video.vid == vid).dicts().get()['uri'];
    if 'file://' in uri:
        uri = uri.replace('file://', '')
    if drive_letter.match(uri):
        uri = uri[3:]
    slash = uri.rfind('/')
    # This assumes we trust what's in the database
    root = uri[:slash]
    filepath = uri[slash + 1:]
    resp = static_file(filepath, root=root)
    allow_cross_origin(resp)
    return resp

@route('/video/<vid>/thumbnail')
def video_thumbnail(vid):
    uri = video.select().where(video.vid == vid).dicts().get()['uri']
    if 'file://' in uri:
        uri = uri.replace('file://', '')
    if drive_letter.match(uri):
        uri = uri[3:]
    slash = uri.rfind('/')
    image = uri.split('/')[-1].split('.')[0] + '.jpg'
    if not os.path.isfile(cache + '/' + image):
        try:
            subprocess.check_output(['ffmpeg', '-y', '-i', uri, '-ss','00:00:10.000', '-vframes', '1', cache + '/' + image])
        except subprocess.CalledProcessError as e:
            img = Image.new('RGB', (640,480), (255, 255, 255))
            img.save(cache + '/' + image, "jpeg")
    # This assumes we trust what's in the database
    root = uri[:slash]
    filepath = uri[slash + 1:]
    resp = static_file(image, root=cache)
    allow_cross_origin(resp)
    return resp

@route('/video/<vid>/heatmap')
def video_heatmap(vid):
    v = video.select().where(video.vid == vid).dicts().get()
    a = analysis.select().where(analysis.vid == vid, analysis.status == 'FINISHED').dicts()
    uri = v['uri']
    if 'file://' in uri:
        uri = uri.replace('file://', '')
    if drive_letter.match(uri):
        uri = uri[3:]
    image = uri.split('/')[-1].split('.')[0] + '.jpg'
    output = image.split('.')[0] + '_heatmap.jpg'
    if not os.path.isfile(cache + '/' + output):
        if not os.path.isfile(cache + '/' + image):
            video_thumbnail(vid)

        def transparent_cmap(cmap, N=8):
            mycmap = cmap
            mycmap._init()
            mycmap._lut[:,-1] = np.linspace(0.5, 1, N+3)
            return mycmap

        I = Image.open(cache + '/' + image).convert('LA')
        w, h = I.size
        y, x = np.mgrid[0:h, 0:w]
        d = np.zeros((h, w))
        for i in a:
            for j in json.loads(i['results']):
                for k in j['detections']:
                    if k['y1'] <= k['y2']:
                        for l in range(k['y1'], k['y2'], 1):
                            if k['x1'] <= k['x2']:
                                d[l][k['x1']:k['x2']] += 1
                            else:
                                d[l][k['x2']:k['x1']] += 1
                    else:
                        for l in range(k['y2'], k['y1'], 1):
                            if k['x1'] <= k['x2']:
                                d[l][k['x1']:k['x2']] += 1
                            else:
                                d[l][k['x2']:k['x1']] += 1

        det = np.max(d)
        plt.style.use('dark_background')
        #cmap = transparent_cmap(mcolors.LinearSegmentedColormap.from_list("", ["#800026", "#ffffcc"]))
        cmap = transparent_cmap(mcolors.LinearSegmentedColormap.from_list("", ["black", "#429321", "#F0ED5E", "#F40E06"], N=8))
        fig = plt.figure()
        ax = fig.subplots(1, 1)
        ax.imshow(I)
        ax.axes.get_xaxis().set_visible(False)
        ax.axes.get_yaxis().set_visible(False)
        cb = ax.contourf(x, y, d, cmap=cmap)
        divider = make_axes_locatable(ax)
        cax = divider.append_axes("right", size="5%", pad=0.05)
        cbar = plt.colorbar(cb, cax=cax)
        cbar.set_ticks([0,0.125*det,0.25*det,0.375*det,0.5*det,0.625*det,0.75*det,0.875*det,det])
        cbar.set_ticklabels(["0%", "12.5%", "25%", "37.5%", "50%", "62.5%", "75%", "87.5%", "100%"])
        plt.savefig(cache + '/' + output, bbox_inches='tight')
    
    resp = static_file(output, root=cache)
    allow_cross_origin(resp)
    return resp

@route('/video/<vid>/statistics')
def video_statistics(vid):
    v = video.select().where(video.vid == vid).dicts().get()
    a = analysis.select().where(analysis.vid == vid, analysis.status == 'FINISHED').dicts()
    analyses = dict()
    total_detections = 0
    frames_with_detections = 0.0
    frame_count = 0
    max_detections = (0, 0)
    min_bounding_box = inf
    avg_bounding_box = 0
    max_bounding_box = -inf

    for i in a:
        results = json.loads(i['results'])
        analyses[i['aid']] = results
        frame_count = max(frame_count, results[-1]['frameindex'])

    for i in range(0, frame_count):
        for j in a:
            count = len(analyses[j['aid']][i]['detections'])
            if count:
                frames_with_detections += 1
            total_detections += count
            if count > max_detections[1]:
                max_detections = (i, count)
            for k in analyses[j['aid']][i]['detections']:
                area = abs(k['x2'] - k['x1']) * abs(k['y2'] - k['y1'])
                min_bounding_box = min(min_bounding_box, area)
                avg_bounding_box += area
                max_bounding_box = max(area, max_bounding_box)

    print(avg_bounding_box, total_detections)
    return fr()({
        'totalDetections': total_detections,
        'percentTimeWithDetections': frames_with_detections / frame_count,
        'minBoundingBoxArea': min_bounding_box,
        'avgBoundingBoxArea': avg_bounding_box / total_detections,
        'maxBoundingBoxArea': max_bounding_box,
        'frameIndexWithHighestDetections': max_detections[0]
    })

@put('/video/<vid>')
def put_video_vid(vid):
    updata = video.update(request.json).where(video.vid == vid).execute()
    data = video.select().where(video.vid == vid).dicts().get()
    return fr()(data)

@get('/analysis')
def get_analysis():
    data = analysis.select().dicts()
    return fr()([analysis for analysis in data])

@post('/analysis')
def post_analysis():
    data = analysis.select().where(analysis.aid==analysis.insert(request.json).execute()).dicts().get()
    return fr()(data)

@get('/analysis/<aid>')
def get_analysis_aid(aid):
    if aid.isdigit():
        data = analysis.select().where(analysis.aid == aid).dicts().get()
        if int(aid) in tasklist:
            p = tasklist[int(aid)]['p'].poll()
            param = json.loads(data['parameters'])
            if p is not None:
                if tasklist[int(aid)]['output'] != 'STDOUT':
                    analysis.update({'status' : 'FINISHED', 'results' : open(tasklist[int(aid)]['output']).read()}).where(analysis.aid == aid).execute()
                data = analysis.select().where(analysis.aid == aid).dicts().get()
                del tasklist[int(aid)]
    else:
        data = "Not a valid analysis ID"
    return fr()(data)

@put('/analysis/<aid>')
def put_analysis_aid(aid):
    updata = analysis.update(request.json).where(analysis.aid == aid).execute()
    data = analysis.select().where(analysis.aid == aid).dicts().get()
    return fr()(data)

@get('/analysis/method')
def get_analysis_method():
    data = analysis_method.select().dicts()
    return fr()([method for method in data])

@post('/analysis/method')
def post_analysis_method():
    data = analysis_method.select().where(analysis_method.mid==analysis_method.insert(request.json).execute()).dicts().get()
    return fr()(data)

@get('/analysis/method/<mid>')
def get_analysis_method_mid(mid):
    data = analysis_method.select().where(analysis_method.mid == mid).dicts().get()
    return fr()(data)

@put('/analysis/method/<mid>')
def put_analysis_method_mid(mid):
    updata = analysis_method.update(request.json).where(analysis_method.mid == mid).execute()
    data = analysis_method.select().where(analysis_method.mid == mid).dicts().get()
    return fr()(data)

# This doesn't seem very secure... and it doesn't seem to work on Windows (generates a 403 seemingly no matter what is passed)
# See up above for the route '/video/<vid>/file'
@route('/file/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root='/')

@post('/process')
def process_video():
    param = request.json
    if "vid" in param:
        if "mid" in param:
            method = analysis_method.select().where(analysis_method.mid == param["mid"]).dicts().get()
        elif "name" in param:
            scanmethods()
            method = analysis_method.select().where(analysis_method.description == name).order_by(analysis_method.creation_date.desc()).dicts().get()
        else:
            return fr()("No analysis method specified")
        procargs = json.loads(method['parameters'])
        vid = video.select().where(video.vid == param["vid"]).dicts().get()
        if 'file://' in vid['uri']:
            output = vid['uri'].replace('file://', '').split('.')[0] + '.json'
            args = [procargs['command'], procargs['videoarg'], vid['uri'].replace('file://', ''), procargs['outputarg'], output]
            aid = analysis.select().where(analysis.aid==analysis.insert({'mid': param['mid'], 'vid': param['vid'], 'status': 'QUEUED', 'parameters': json.dumps(args), 'results' : ''}).execute()).dicts().get()
            print(args)
            tasklist[aid['aid']] = {'p': Popen(args, env=eye_env), 'output' : output}
        else:
            return fr()('Unknown video file handler')
        analysis.update({'status' : 'PROCESSING'}).where(analysis.aid == aid['aid']).execute()
        data = analysis.select().where(analysis.aid == aid['aid']).dicts().get()
        return fr()(data)
    else:
        return fr()("No video or analysis method specified")

app = application = bottle.default_app()

if __name__ == '__main__':
    bottle.run(host = '0.0.0.0', port = 8080, debug = True)
