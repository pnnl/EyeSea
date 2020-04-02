#!/usr/bin/env python2
'''
Copyright 2018 Battelle Memorial Institute. All rights reserved.
'''
from __future__ import division  # divide array by scalar, don't floor result

import cgi
import bottle
import json
import os
import re
import subprocess
import base64
import time
import hashlib
import sys
import zipfile
import math

import numpy as np
from numpy import inf

import matplotlib
# the following line is needed for running on Mac in vituralenv or conda
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from mpl_toolkits.axes_grid1 import make_axes_locatable

from PIL import Image
from subprocess import check_output, Popen, PIPE, CalledProcessError
from bottle import request, response, post, get, put, delete, hook, route, static_file
from eyesea_db import *
from peewee import fn

import ffmpeg

# 1.5 GB, which could cause issues on machines without enough RAM if it doesn't use a
# disk-based temporary file.
bottle.BaseRequest.MEMFILE_MAX = 1610612736

settings = json.loads(open('eyesea_settings.json').read())

cache = settings['cache']
if not os.path.isdir(cache):
    os.mkdir(cache)

videostore = settings['video_storage']
if not os.path.isdir(videostore):
    os.mkdir(videostore)

tmp = settings['temporary_storage']
if not os.path.isdir(tmp):
    os.mkdir(tmp)
else:
    for i in os.listdir(tmp):
        os.remove(os.path.join(tmp, i))

vformat = settings['video_format']
vcodec = settings['ffmpeg_vcodec']

# default to algorithms dir, leave algorithm_bin in settings empty in repo to avoid
# OS-specific path
if not settings['algorithm_bin']:
    abs_algorithm_path = os.path.abspath(os.path.join(
        os.path.abspath(os.curdir), "..", "algorithms"))
else:
    abs_algorithm_path = os.path.abspath(settings['algorithm_bin'])
eye_env = os.environ
eye_env['PATH'] = abs_algorithm_path + os.pathsep + eye_env['PATH']
tasklist = {}

# Just store methods in the algorithm dir -- don't scan the whole path


def scanmethods():
    methods = analysis_method.select().dicts()
#    for i in eye_env['PATH'].split(os.pathsep):
    i = abs_algorithm_path
    for j in os.listdir(i):
        name, ext = os.path.splitext(j)
        if ext == '.json':
            root = os.path.abspath(i)
            fdict = json.loads(open(root + os.sep + j).read())
            fjson = json.dumps(fdict)  # normalize json
            found = False
            # TODO How do we want to handle two algorithms which might have the same parameter names
            #      but do different things with them? Is that even a concern?
            # shari: No, this is not a concern.
            for k in methods:
                if 'name' in fdict:
                    if k['parameters'] == fjson:
                        found = True
            if not found and 'name' in fdict:
                # The code for running these knows what this path is, assuming it hasn't changed, and
                # will run them from there; this makes it more portable and no worse than before this
                # was changed to become path aware
                path = '' if abs_algorithm_path == root else root
                #print("****** path = " + path)
                analysis_method.insert({'description': fdict['name'], 'parameters': fjson, 'creation_date': int(
                    time.time()), 'automated': 1, 'path': path}).execute()
                methods = analysis_method.select().dicts()


scanmethods()


def format_video(vid, analyses=None):
    if not analyses:
        analyses = [get_or_update_analysis(i) for i in analysis.select(
            analysis).where(analysis.vid == vid['vid']).dicts()]
    return {
        'id': vid['vid'],
        'filename': vid['filename'],
        'description': vid['description'],
        'fps': vid['fps'],
        'variableFramerate': vid['variable_framerate'],
        'duration': vid['duration'],
        'uri': vid['uri'],
        'analyses': analyses
    }


def get_or_update_analysis(a):
    if a['aid'] in tasklist:
        task = tasklist[a['aid']]
        p = task['p'].poll()
        if p is not None:
            data = {'status': 'FINISHED', 'results': ''}
            if p:
                data['status'] = 'FAILED'
                task['error'].flush()
                os.fsync(task['error'].fileno())
                data['results'] = task['error'].read()
            else:
                with open(task['output']) as f:
                    results = json.loads(f.read())['frames']
                    data['results'] = json.dumps(
                        results, separators=(',', ':'))
            analysis.update(data).where(analysis.aid == a['aid']).execute()
            a = analysis.select().where(analysis.aid == a['aid']).dicts().get()
            del tasklist[a['aid']]
            # cleanup time
            try:
                os.remove(task['output'])
            except OSError:
                pass
            try:
                task['error'].close()
                os.remove(task['error'].name)
            except OSError:
                pass

    results = json.loads(a['results'] if a['results'] else '{}')
    return {
        'id': a['aid'],
        'status': a['status'],
        'method': a['mid'],
        'results': [
            {
                'detections': frame['detections'],
                'frameIndex': frame['frameindex']
            } for frame in results
        ]
    }


# Not everything is friendly with a file:// path.
drive_letter = re.compile('/[a-zA-Z]:')


def fix_path(uri):
    is_file_scheme = False
    if 'file://' in uri:
        uri = uri.replace('file://', '')
        is_file_scheme = True
    if drive_letter.match(uri):
        uri = uri[3:]
    return (uri, is_file_scheme)

# We do one or more of these frequently:
# - getting the file name with extension
# - getting the file name without extension
# - getting the root folder for the file
# TODO: use os.path methods
def get_video_path_parts(vid):
    uri, is_file_scheme = fix_path(vid['uri'])
    slash = uri.rfind(os.sep)
    if slash < 0 and uri[0] == '/':
        slash = uri.rfind('/')
    pathname = uri[slash + 1:] if is_file_scheme else uri
    filename = os.path.splitext(pathname)[0]
    root = uri[:slash] if is_file_scheme else videostore
    return (pathname, filename, root)


def queue_analysis(index, vid, method, procargs=None):
    # Will throw an error if vid is not-existent, this is on purpose because all future
    # analyses would die with the same error so we cut out early.
    vid = video.select(video).where(video.vid == vid).dicts().get()
    # NOTE: in Python 3, long is no longer. int is the new long.
    # if isinstance(method, (int, long)):
    if isinstance(method, (int, int)):
        try:
            method = analysis_method.select(analysis_method).where(
                analysis_method.mid == method).dicts().get()
        except analysis_method.DoesNotExist:
            return {'error': 'Invalid method ID specified.', details: str(method)}

    try:
        base_args = json.loads(method['parameters'])
        if procargs == None or not len(procargs):
            procargs = {i["arg"]: int(i["default"]) if i["type"] == "int" else (float(
                i["default"]) if i["type"] == "float" else str(i["default"])) for i in base_args['parameters']}
    except ValueError as err:
        # Will also catch JSONDecodeError if we switch to Python 3 as that's a subclass
        return {'error': 'Error parsing parameters', 'details': str(err)}

    aid = None
    # quick fix until front-end updated to handle updated json format
    if "parameters" in procargs.keys():
        procargs = procargs["parameters"]
    print(procargs)
    try:
        pathname, filename, root = get_video_path_parts(vid)
        # Purposely using base_args for 'command' here, to avoid the user being able to change it with custom args
        script = '{p}/{f}'.format(p=method['path'] if method['path']
                                  else abs_algorithm_path, f=base_args['script'])
        print('******* script = ' + script)
        input = '{p}/{f}'.format(p=root, f=pathname)
        # Prevent stepping on toes if for some reason the user selects the same algorithm twice for a video or one
        # in use by another video whose source hashes to the same as this video.
        slug = '{p}/{f}-{v}-{i}-{m}'.format(p=tmp, f=filename,
                                            v=vid['vid'], i=index, m=method['mid'])
        output = slug + '.json'
        args = ['python', script, input, output]
        args.extend(np.array([[k, v] for k, v in procargs.items()]).flatten())
        aid = analysis.select().where(analysis.aid == analysis.insert(
            {'mid': method['mid'], 'vid': vid['vid'], 'status': 'QUEUED', 'parameters': json.dumps(procargs), 'results': ''}).execute()).dicts().get()
        stderr = open(slug + '.err', 'w+')
        # Python on Windows hates u'' strings apparently; This should go away with a switch to Python 3.x
        local_env = {str(key): str(value)
                     for key, value in eye_env.iteritems()}
        tasklist[aid['aid']] = {'p': Popen(
            args, env=local_env, stderr=stderr), 'output': output, 'error': stderr}
        analysis.update({'status': 'PROCESSING'}).where(
            analysis.aid == aid['aid']).execute()
        return analysis.select().where(analysis.aid == aid['aid']).dicts().get()
    except:
        print("Unexpected error:", sys.exc_info()[0])
        if aid:
            analysis.update({'status': 'FAILED'}).where(
                analysis.aid == aid['aid']).execute()

# Should be similar to what subprocess.checkout_output does, except it handles stderr
def check_output_with_error(*pargs, **args):
    if 'stdout' in args or 'stderr' in args:
        raise ValueError(
            'stdout and stderr not allowed, as they are overriden')

    proc = subprocess.Popen(stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, *pargs, **args)
    stdout, stderr = proc.communicate()
    exit_code = proc.poll()

    if exit_code:
        cmd = args.get('args') if 'args' in args else pargs[0]
        error = CalledProcessError(exit_code, cmd, output=stdout)

        # Python 3
        if 'stderr' in error.__dict__:
            error.stderr = stderr
        else:
            # Python 2.7, make it behave like Python 3
            error.__dict__['stdout'] = error.output
            error.__dict__['stderr'] = stderr

        raise error
    return stdout


@route('/', method='OPTIONS')
@route('/<path:path>', method='OPTIONS')
def options_handler(path=None):
    return


def fr():
    hdr = request.get_header('Content-Type')
    if hdr == None:
        return lambda x: x
    elif hdr.lower() == 'text/plain':
        return lambda x: x
    elif hdr.lower() == 'application/json' or hdr.lower().find('multipart/form-data') == 0:
        return json.dumps
    else:
        return lambda x: 'Unknown request header: ' + hdr


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
    data = analysis.select(analysis.status, fn.COUNT(
        analysis.status).alias('count')).group_by(analysis.status).dicts()
    counts = dict()
    for i in data:
        counts[i['status']] = i['count']
    data = {'total_videos': len(video.select()),
            'total_analyses': len(analysis.select()),
            'total_analyses_completed': counts['FINISHED'] if 'FINISHED' in counts else 0,
            'total_analyses_failed': counts['FAILED'] if 'FAILED' in counts else 0,
            'total_analyses_processing': counts['PROCESSING'] if 'PROCESSING' in counts else 0,
            'total_analyses_queued': counts['QUEUED'] if 'QUEUED' in counts else 0
            }
    return fr()(data)

# FIXME
@get('/video')
def get_video():
    sortBy = []
    if 'sortBy' in request.query:
        try:
            sortBy = map(lambda sort: getattr(video, sort['prop']) if sort['asc'] else -getattr(
                video, sort['prop']), json.loads(request.query['sortBy']))
        except ValueError as error:
            return {'error': 'Error parsing sortBy parameter', 'details': str(error)}

    data = video.select(video).order_by(*sortBy).dicts()
    data = [format_video(i) for i in data]
    return fr()(data)


@post('/video')
def post_video():
    # display file selection dialog for user
    upload = request.files.get('upload')
    name, ext = os.path.splitext(upload.filename)

    # create a unique filename for the uploaded file
    hash = hashlib.sha256()
    for bytes in iter(lambda: upload.file.read(65536), b''):
        hash.update(bytes)
    filename = hash.hexdigest() + '.' + vformat
    upload.file.seek(0)
    
    # save the file on the server
    #dest_path = '{p}/{f}'.format(p=videostore, f=filename)
    dest_path = os.path.join(videostore, filename)
    if not os.path.exists(dest_path):
        # if the video is already in the correct format, save as is
        if ext[1:] == vformat:
            upload.save(dest_path)
        else:
            #temp_path = '{p}/{f}'.format(p=tmp, f=upload.filename)
            temp_path = os.path.join(tmp, upload.filename)
            upload.save(temp_path)
            try:
                # TODO: ensure best possible quality of video, not good to 
                # transcode already compressed video
                check_output_with_error(['ffmpeg', '-y', '-i', temp_path, '-an', '-vcodec', vcodec,
                                         #'{p}/{f}'.format(p=videostore, f=filename)])
                                          os.path.join(videostore, filename)])
            except CalledProcessError as error:
                return fr()({'error': 'Error converting video to format ' + vcodec,
                             'details': error.stderr.decode(sys.getfilesystemencoding())})
            finally:
                os.remove(temp_path)

    info = None
    try:
        info = json.loads(check_output_with_error(['ffprobe', dest_path, '-v', 'error', '-print_format', 'json',
                                                   '-show_entries', 'stream=duration,r_frame_rate,avg_frame_rate,width,height']).decode('UTF-8'))
    except CalledProcessError as error:
        return fr()({'error': 'Error getting video metadata',
                     'details': error.stderr.decode(sys.getfilesystemencoding())})

    if info and 'streams' in info and len(info['streams']) > 0:
        info = info['streams'][0]
        fps = info['avg_frame_rate'].split('/')
        fps = float(fps[0]) / float(fps[1])
        dbdata = dict()
        dbdata['description'] = request.forms.get('description')
        dbdata['filename'] = upload.raw_filename
        # [Ab]using SQLite's soft typing here, giving it the integer type we 
        # declared only if it works out to be a nice number
        # Digitally recorded or pre-converted videos should give us a nice exact FPS like 30 or 60.
        dbdata['fps'] = int(fps) if int(fps) == fps else fps
        # r_frame_rate is "the lowest framerate with which all timestamps can 
        # be represented accurately (it is the least common multiple of all framerates in the stream)."
        dbdata['variable_framerate'] = info['r_frame_rate'] != info['avg_frame_rate']
        dbdata['duration'] = float(info['duration'])
        # use full path; not all files will be in videostore
        dbdata['uri'] = dest_path
        dbdata['creation_date'] = int(time.time())
        dbdata['width'] = info['width']
        dbdata['height'] = info['height']
        data = video.select().where(video.vid == video.insert(dbdata).execute()).dicts().get()

        try:
            analyses = json.loads(request.forms.get('analyses'))
        except ValueError as error:
            return fr()({'error': 'Unable to parse list of analyses.', 'details': str(error)})

        results = []
        for i, a in enumerate(analyses):
            results.append(queue_analysis(
                i, data['vid'], a['mid'], a['parameters']))

        return fr()(format_video(data, results))
    return fr()({'error': 'Video metadata returned no streams.'})


@get('/video/<vid>')
def get_video_vid(vid):
    data = video.select().where(video.vid == vid).dicts().get()
    return fr()(format_video(data))


@route('/video/<vid>/file')
def server_static(vid):
    v = video.select().where(video.vid == vid).dicts().get()
    pathname, filename, root = get_video_path_parts(v)
    print('from cache: ' + root + os.sep + pathname)
    resp = static_file(pathname, root=root)
    allow_cross_origin(resp)
    return resp


@route('/video/<vid>/thumbnail')
def video_thumbnail(vid):
    v = video.select().where(video.vid == vid).dicts().get()
    pathname, filename, root = get_video_path_parts(v)
    image = filename + '.jpg'
    if not os.path.isfile(cache + os.sep + image):
        try:
            subprocess.check_output(['ffmpeg', '-y', '-i', '{p}/{f}'.format(p=root, f=pathname),
                '-ss','00:00:01.000', '-vframes', '1', cache + os.sep + image])
        except subprocess.CalledProcessError as e:
            img = Image.new('RGB', (640, 480), (255, 255, 255))
            print('to cache: ' + cache + os.sep + image)
            img.save(cache + os.sep + image, 'jpeg')

    print('from cache: ' + cache + os.sep + image)
    resp = static_file(image, root=cache)
    allow_cross_origin(resp)
    return resp

# this function was created to support client rendering
# of heatmap but the heatmap was not overlayed on an 
# image.  Overly on an image is what makes the heatmap
# useful.  
@route('/video/<vid>/heatmap/json')
def video_heatmap_json(vid):
    v = video.select().where(video.vid == vid).dicts().get()
    a = analysis.select().where(analysis.vid == vid,
                                analysis.status == 'FINISHED').dicts()
    pathname, filename, root = get_video_path_parts(v)
    output = filename + '_heatmap.json'
    if not os.path.isfile(cache + os.sep + output):
        w = v['width']
        h = v['height']
        y, x = np.mgrid[0:h, 0:w]
        d = np.zeros((h, w))
        for i in a:
            for j in json.loads(i['results']):
                for q in j['detections']:
                    k = {key: int(value) for key, value in q.items()}
                    if 'y1' in k and 'y2' in k and 'x1' in k and 'x2' in k:
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

        max_det = np.max(d)
        # reduce the matrix to a manageable size
        s = np.zeros((100, 100))
        for y in range(len(d)):
            for x in range(len(d[y])):
                a = int(math.floor(np.interp(y, [0, h], [0, 100])))
                b = int(math.floor(np.interp(x, [0, w], [0, 100])))
                s[a][b] = max(s[a][b], d[y][x])
        # the visualization needs pairs
        pairs = []
        for y in range(len(s)):
            for x in range(len(s[y])):
                if s[y][x] > 0:
                    pairs.append([x, 100 - y, s[y][x]])
        data = {'id': int(vid), 'maxdet': max_det, 'data': pairs}
        with open(cache + os.sep + output, 'w') as fp:
            print('to cache: ' + cache + os.sep + output)
            json.dump(data, fp, sort_keys=True, indent=4)

    print('from cache: ' + cache + os.sep + output)
    resp = static_file(output, root=cache)
    allow_cross_origin(resp)
    return resp


# original heatmap overlayed on thumbnail image
@route('/video/<vid>/heatmap')
def video_heatmap(vid):
    v = video.select().where(video.vid == vid).dicts().get()
    a = analysis.select().where(analysis.vid == vid,
                                analysis.status == 'FINISHED').dicts()
    pathname, filename, root = get_video_path_parts(v)
    image = filename + '.jpg'
    output = filename + '_heatmap.jpg'
    if not os.path.isfile(cache + os.sep + output):
        if not os.path.isfile(cache + os.sep + image):
            video_thumbnail(vid)

        def transparent_cmap(cmap, N=8):
            mycmap = cmap
            mycmap._init()
            mycmap._lut[:, -1] = np.linspace(0.5, 1, N+3)
            return mycmap

        I = Image.open(cache + os.sep + image).convert('LA')
        w, h = I.size
        y, x = np.mgrid[0:h, 0:w]
        d = np.zeros((h, w))
        for i in a:
            for j in json.loads(i['results']):
                for q in j['detections']:
                    k = {key: int(value) for key, value in q.items()}
                    if 'y1' in k and 'y2' in k and 'x1' in k and 'x2' in k:
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

        max_det = np.max(d)
        plt.style.use('dark_background')
        # cmap = transparent_cmap(mcolors.LinearSegmentedColormap.from_list('', ['#800026', '#ffffcc']))
        cmap = transparent_cmap(mcolors.LinearSegmentedColormap.from_list(
            '', ['black', '#429321', '#F0ED5E', '#F40E06'], N=8))
        fig = plt.figure()
        ax = fig.subplots(1, 1)
        ax.imshow(I)
        ax.axes.get_xaxis().set_visible(False)
        ax.axes.get_yaxis().set_visible(False)
        cb = ax.contourf(x, y, d, cmap=cmap)
        divider = make_axes_locatable(ax)
        cax = divider.append_axes('right', size='5%', pad=0.05)
        cbar = plt.colorbar(cb, cax=cax)
        # cbar.set_ticks([0,0.125*det,0.25*det,0.375*det,0.5*det,0.625*det,0.75*det,0.875*det,det])
        cbar.set_ticks(
            (np.array([0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.00])*max_det).tolist())
        #cbar.set_ticklabels(['0%', '12.5%', '25%', '37.5%', '50%', '62.5%', '75%', '87.5%', '100%'])
        print('to cache: ' + cache + os.sep + output)
        plt.savefig(cache + os.sep + output, bbox_inches='tight')

    print('from cache: ' + cache + os.sep + output)
    resp = static_file(output, root=cache)
    allow_cross_origin(resp)
    return resp


@route('/video/<vid>/statistics')
def video_statistics(vid):
    v = video.select().where(video.vid == vid).dicts().get()
    a = analysis.select().where(analysis.vid == vid,
                                analysis.status == 'FINISHED').dicts()
    analyses = dict()
    total_detections = 0
    frames_with_detections = 0.0
    frame_count = 0
    max_detections = (0, 0)
    min_length = inf
    avg_length = 0
    max_length = -inf

    for i in a:
        results = json.loads(i['results'])
        # print(results)
        analyses[i['aid']] = results
        if results:
            frame_count = max(frame_count, results[-1]['frameindex'])
        print("frame_count = {:d}".format(frame_count))

    for i in range(0, frame_count):
        for j in a:
            count = len(analyses[j['aid']][i]['detections'])
            if count:
                frames_with_detections += 1
            total_detections += count
            if count > max_detections[1]:
                max_detections = (i, count)
            for k in analyses[j['aid']][i]['detections']:
                length = max(abs(k['x2'] - k['x1']), abs(k['y2'] - k['y1']))
                min_length = min(min_length, length)
                avg_length += length
                max_length = max(length, max_length)

    return fr()({
        'id': int(vid),
        'totalDetections': total_detections,
        'percentTimeWithDetections': (frames_with_detections / frame_count) / len(a) if frame_count else 0,
        'minBoundingBoxLength': min_length if not np.isposinf(min_length) else 0,
        'avgBoundingBoxLength': avg_length / total_detections if total_detections else 0,
        'maxBoundingBoxLength': max_length if max_length >= 0 else 0,
        'frameIndexWithHighestDetections': max_detections[0]
    })


@put('/video/<vid>')
def put_video_vid(vid):
    updata = video.update(request.json).where(video.vid == vid).execute()
    data = video.select().where(video.vid == vid).dicts().get()
    return fr()(format_video(data))


@get('/analysis')
def get_analysis():
    data = analysis.select().dicts()
    return fr()([analysis for analysis in data])


@post('/analysis')
def post_analysis():
    data = analysis.select().where(analysis.aid == analysis.insert(
        request.json).execute()).dicts().get()
    return fr()(data)


@get('/analysis/<aid>')
def get_analysis_aid(aid):
    if aid.isdigit():
        data = analysis.select().where(analysis.aid == aid).dicts().get()
        data = get_or_update_analysis(data)
    else:
        data = {'error': 'Not a valid analysis ID'}
    return fr()(data)


@put('/analysis/<aid>')
def put_analysis_aid(aid):
    updata = analysis.update(request.json).where(analysis.aid == aid).execute()
    data = analysis.select().where(analysis.aid == aid).dicts().get()
    return fr()(data)


@get('/analysis/method')
def get_analysis_method():
    data = analysis_method.select().dicts()
    data = [(lambda method: {
        'mid': method['mid'],
        'description': method['description'],
        'automated': method['automated'],
        'parameters': {i["arg"]: int(i["default"]) if i["type"] == "int" else (float(i["default"]) if i["type"] == "float" else str(i["default"])) for i in json.loads(method['parameters'])['parameters']} if method['parameters'] else dict(),
        'creationDate': method['creation_date'],
        'metadata': {j["arg"]: j for j in json.loads(method['parameters'])['parameters']} if method['parameters'] else dict()
    })(i) for i in data]
    return fr()(data)


@post('/analysis/method')
def post_analysis_method():
    data = analysis_method.select().where(analysis_method.mid ==
                                          analysis_method.insert(request.json).execute()).dicts().get()
    return fr()(data)


@get('/analysis/method/<mid>')
def get_analysis_method_mid(mid):
    data = analysis_method.select().where(analysis_method.mid == mid).dicts().get()
    return fr()(data)


@put('/analysis/method/<mid>')
def put_analysis_method_mid(mid):
    updata = analysis_method.update(request.json).where(
        analysis_method.mid == mid).execute()
    data = analysis_method.select().where(analysis_method.mid == mid).dicts().get()
    return fr()(data)

# This doesn't seem very secure... and it doesn't seem to work on Windows (generates a 403 seemingly no matter what is passed)
# See up above for the route '/video/<vid>/file'
@route('/file/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root='/')


@post('/process')
def process_video():
    vid = int(request.forms.get('vid'))
    data = video.select().where(video.vid == vid).dicts().get()
    try:
        analyses = json.loads(request.forms.get('analyses'))
    except ValueError as error:
        return fr()({'error': 'Unable to parse list of analyses.', 'details': str(error)})

    results = []
    for i, a in enumerate(analyses):
        results.append(queue_analysis(i, vid, a['mid'], a))
    print(results)
    return fr()(format_video(data, results))

@get('/video/<vid>/<filename>')
def write_csv(vid, filename):
    import csv
    import datetime

    v = video.select(video).where(video.vid == vid).dicts().get()
    fname = os.path.splitext(os.path.basename(v['filename']))[0] + '.csv'

    a = analysis.select().where(analysis.vid == vid,
                                analysis.status == 'FINISHED').dicts()

    colnames = ['time', 'x', 'y', 'w', 'h', 'method']
    with open(os.path.join(tmp, fname),'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(colnames)
        
        for i in a:
            m = analysis_method.select().where(analysis_method.mid == i['mid']).dicts().get()
            ms = m['description']
            for j in json.loads(i['results']):
                if len(j['detections']) == 0: continue
                ts = str(datetime.timedelta(seconds=j['frameindex']/v['fps']))
                for q in j['detections']:
                    x = int(min(q['x1'], q['x2']))
                    y = int(min(q['y1'], q['y2']))
                    w = int(abs(q['x1'] - q['x2']))
                    h = int(abs(q['y1'] - q['y2']))
                    row = [ts, x, y, w, h, ms]
                    writer.writerow(row)

    return static_file(fname, root=tmp)

def zipdir(path, ziph):
    # ziph is zipfile handle
    for root, dirs, files in os.walk(path):
        for file in files:
            ziph.write(os.path.join(root, file))


#@get('/video/<vid>/<filename>')
def compress_annotations(vid, filename):
    a = analysis.select().where(analysis.vid == vid,
                                analysis.status == 'FINISHED').dicts()
    os.mkdir(tmp + os.path.sep + vid)
    # collect all the annotations
    for i in a:
        with open(tmp + os.path.sep + vid + os.path.sep + str(i['aid']) + ".json", "w") as f:
            f.write(i["results"])
    fname = vid + '.zip'
    zipf = zipfile.ZipFile(tmp + os.path.sep + fname, 'w', zipfile.ZIP_DEFLATED)
    for root, dirs, files in os.walk(tmp + os.path.sep + vid):
        for file in files:
            zipf.write(os.path.join(root, file))
    zipf.close()
    print(tmp + os.path.sep + vid + '.zip')
    for i in os.listdir(tmp + os.path.sep + vid):
        os.remove(os.path.join(tmp + os.path.sep + vid, i))
    os.rmdir(tmp + os.path.sep + vid)
    return static_file(fname, root=tmp)


@post('/annotations')
def annotations():
    data = request.forms.get('data')
    data = data.replace("frameIndex", "frameindex")
    aid = 0
    if len(data) > 0:
        i = json.loads(data)
        for j in i['analyses']:
            try:
                a = analysis.select().where(analysis.vid ==
                                            i['id'], analysis.status == 'FINISHED', analysis.mid == j['method']).dicts().get()
                aid = a['aid']
                analysis.update(results=json.dumps(j['results'])).where(
                    analysis.aid == aid).execute()
            except analysis.DoesNotExist:
                aid = analysis.insert({'mid': j['method'], 'vid': i['id'], 'status': 'FINISHED',
                                       'parameters': '', 'results': json.dumps(j['results'])}).execute()
        return fr()({'status': 'SUCCESS', 'aid': aid})
    return fr()({'status': 'FAILED'})


app = application = bottle.default_app()

if __name__ == '__main__':
    bottle.run(host='0.0.0.0', port=8080, debug=True)
