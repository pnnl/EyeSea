#!/usr/bin/env python2
import json
import bottle
import os
import re
import subprocess
import base64
import time
import hashlib
import sys

import numpy as np
from numpy import inf
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from mpl_toolkits.axes_grid1 import make_axes_locatable

from PIL import Image
from subprocess import check_output, Popen, PIPE, CalledProcessError
from bottle import request, response, post, get, put, delete, hook, route, static_file
from eyesea_db import *
from peewee import fn

# 1.5 GB, which could cause issues on machines without enough RAM if it doesn't use a
# disk-based temporary file.
bottle.BaseRequest.MEMFILE_MAX = 1610612736;

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
        os.remove(os.path.join(tmp,i))

vformat = settings['video_format']
vcodec = settings['ffmpeg_vcodec']
    
eye_env = os.environ
eye_env['PATH'] = os.path.abspath(settings['algorithm_bin']) + os.pathsep + eye_env['PATH']
tasklist = {}

def scanmethods():
    methods = analysis_method.select().dicts()
    for i in eye_env['PATH'].split(os.pathsep):
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
                    analysis_method.insert({'description' : fdict['name'], 'parameters' : fjson, 'creation_date' : int(time.time()), 'automated' : 1}).execute()
                    methods = analysis_method.select().dicts()

scanmethods()

def format_video(vid, analyses = None):
    if not analyses:
        analyses = [get_or_update_analysis(i) for i in analysis.select(analysis).where(analysis.vid == vid['vid']).dicts()]
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
            data = {'status' : 'FINISHED', 'results' : ''}
            if p:
                data['status'] = 'ERROR'
                task['error'].flush()
                os.fsync(task['error'].fileno())
                data['results'] = task['error'].read()
            else:
                data['results'] = open(task['output']).read()
            analysis.update(data).where(analysis.aid == a['aid']).execute()
            a = analysis.select().where(analysis.aid == a['aid']).dicts().get()
            del tasklist[a['aid']]
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
def get_video_path_parts(vid):
    uri, is_file_scheme = fix_path(vid['uri'])
    slash = uri.rfind('/')
    pathname = uri[slash + 1:] if is_file_scheme else uri
    filename = os.path.splitext(pathname)[0]
    root = uri[:slash] if is_file_scheme else videostore
    return (pathname, filename, root)

def queue_analysis(vid, method, procargs = None):
    try:
        vid = video.select().where(video.vid == vid).dicts().get()
        aid = None

        base_args = json.loads(method['parameters'])
        if procargs == None:
            procargs = base_args

        pathname, filename, root = get_video_path_parts(vid)
        output = '{p}/{f}'.format(p=tmp, f=filename + '.json')
        args = [base_args['command'], base_args['videoarg'], '{p}/{f}'.format(p=root, f=pathname), base_args['outputarg'], output]
        args.extend(np.array(procargs).flatten())
        aid = analysis.select().where(analysis.aid==analysis.insert({'mid': method['mid'], 'vid': vid, 'status': 'QUEUED', 'parameters': json.dumps(args), 'results' : ''}).execute()).dicts().get()
        stderr = open('{p}/{f}'.format(p=tmp, f=filename + '.err'), 'w+')
        tasklist[aid['aid']] = {'p': Popen(args, env=eye_env, stderr=stderr), 'output' : output, 'error' : stderr}
        analysis.update({'status' : 'PROCESSING'}).where(analysis.aid == aid['aid']).execute()
        return analysis.select().where(analysis.aid == aid['aid']).dicts().get()
    except:
        return {'error': 'Invalid video ID specified.'}

# Should be similar to what subprocess.checkout_output does, except it handles stderr
def check_output_with_error(*pargs, **args):
    if 'stdout' in args or 'stderr' in args:
        raise ValueError('stdout and stderr not allowed, as they are overriden')

    proc = subprocess.Popen(stdout=subprocess.PIPE, stderr=subprocess.PIPE, *pargs, **args)
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
    print(request.query['sortBy'])
    data = [format_video(i) for i in data]
    return fr()(data)

import cgi

@post('/video')
def post_video():
    upload = request.files.get('upload')
    name, ext = os.path.splitext(upload.filename)

    hash = hashlib.sha256()
    for bytes in iter(lambda: upload.file.read(65536), b''):
        hash.update(bytes)
    filename = hash.hexdigest() + '.' + vformat
    upload.file.seek(0)

    dest_path = '{p}/{f}'.format(p=videostore, f=filename)
    if not os.path.exists(dest_path):
        if ext[1:] == vformat:
            upload.save(dest_path)
        else:
            temp_path = '{p}/{f}'.format(p=tmp, f=upload.filename)
            upload.save(temp_path)
            try:
                check_output_with_error(['ffmpeg', '-y', '-i', temp_path, '-an', '-vcodec', vcodec,
                    '{p}/{f}'.format(p=videostore, f=filename)])
            except CalledProcessError as error:
                return fr()({'error': 'Error converting video to format ' + vcodec,
                    'details': error.stderr.decode(sys.getfilesystemencoding())})
            finally:
                os.remove(temp_path)

    try:
        info = json.loads(check_output_with_error(['ffprobe', dest_path, '-v', 'error', '-print_format', 'json',
            '-show_entries', 'stream=duration,r_frame_rate,avg_frame_rate']).decode('UTF-8'))

        if 'streams' in info and len(info['streams']) > 0:
            info = info['streams'][0]
            fps = info['avg_frame_rate'].split('/')
            fps = float(fps[0]) / float(fps[1])
            dbdata = dict()
            dbdata['description'] = request.forms.get('description')
            dbdata['filename'] = upload.raw_filename
            # [Ab]using SQLite's soft typing here, giving it the integer type we declared only if it works out to be a nice number
            # Digitally recorded or pre-converted videos should give us a nice exact FPS like 30 or 60.
            dbdata['fps'] = int(fps) if int(fps) == fps else fps
            # r_frame_rate is apparently a guess on their part, so this necessarily is too
            dbdata['variable_framerate'] = info['r_frame_rate'] != info['avg_frame_rate']
            dbdata['duration'] = float(info['duration'])
            dbdata['uri'] = filename
            dbdata['creation_date'] = int(time.time())
            data = video.select().where(video.vid==video.insert(dbdata).execute()).dicts().get()

            results = []
            try:
                analyses = json.loads(request.forms.get('analyses'))
                for a in analyses:
                    results.append(queue_analysis(data['vid'], a['mid'], a['parameters']))
            except:
                return fr()({'error': 'Unable to parse list of analyses.'})

            return fr()(format_video(data, results))
        return fr()({'error': 'Video metadata returned no streams.'})
    except CalledProcessError as error:
        return fr()({'error': 'Error getting video metadata',
            'details': error.stderr.decode(sys.getfilesystemencoding())})

@get('/video/<vid>')
def get_video_vid(vid):
    data = video.select().where(video.vid == vid).dicts().get();
    return fr()(format_video(data))

@route('/video/<vid>/file')
def server_static(vid):
    v = video.select().where(video.vid == vid).dicts().get();
    pathname, filename, root = get_video_path_parts(v)
    resp = static_file(pathname, root=root)
    allow_cross_origin(resp)
    return resp

@route('/video/<vid>/thumbnail')
def video_thumbnail(vid):
    v = video.select().where(video.vid == vid).dicts().get()
    pathname, filename, root = get_video_path_parts(v)
    image = filename + '.jpg'
    if not os.path.isfile(cache + '/' + image):
        try:
            subprocess.check_output(['ffmpeg', '-y', '-i', '{p}/{f}'.format(p=root, f=pathname),
                '-ss','00:00:10.000', '-vframes', '1', cache + '/' + image])
        except subprocess.CalledProcessError as e:
            img = Image.new('RGB', (640,480), (255, 255, 255))
            img.save(cache + '/' + image, 'jpeg')
    resp = static_file(image, root=cache)
    allow_cross_origin(resp)
    return resp

@route('/video/<vid>/heatmap')
def video_heatmap(vid):
    v = video.select().where(video.vid == vid).dicts().get()
    a = analysis.select().where(analysis.vid == vid, analysis.status == 'FINISHED').dicts()
    pathname, filename, root = get_video_path_parts(v)
    image = filename + '.jpg'
    output = filename + '_heatmap.jpg'
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
        #cmap = transparent_cmap(mcolors.LinearSegmentedColormap.from_list('', ['#800026', '#ffffcc']))
        cmap = transparent_cmap(mcolors.LinearSegmentedColormap.from_list('', ['black', '#429321', '#F0ED5E', '#F40E06'], N=8))
        fig = plt.figure()
        ax = fig.subplots(1, 1)
        ax.imshow(I)
        ax.axes.get_xaxis().set_visible(False)
        ax.axes.get_yaxis().set_visible(False)
        cb = ax.contourf(x, y, d, cmap=cmap)
        divider = make_axes_locatable(ax)
        cax = divider.append_axes('right', size='5%', pad=0.05)
        cbar = plt.colorbar(cb, cax=cax)
        cbar.set_ticks([0,0.125*det,0.25*det,0.375*det,0.5*det,0.625*det,0.75*det,0.875*det,det])
        cbar.set_ticklabels(['0%', '12.5%', '25%', '37.5%', '50%', '62.5%', '75%', '87.5%', '100%'])
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
        'percentTimeWithDetections': frames_with_detections / frame_count if frame_count else 0,
        'minBoundingBoxArea': min_bounding_box if not np.isposinf(min_bounding_box) else 0,
        'avgBoundingBoxArea': avg_bounding_box / total_detections if total_detections else 0,
        'maxBoundingBoxArea': max_bounding_box if max_bounding_box >= 0 else 0,
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
    data = analysis.select().where(analysis.aid==analysis.insert(request.json).execute()).dicts().get()
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
        'parameters': json.loads(method['parameters'])['parameters'] if method['parameters'] else dict(),
        'creationDate': method['creation_date']
    })(i) for i in data]
    return fr()(data)

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
    if 'mid' in param:
        method = analysis_method.select().where(analysis_method.mid == param['mid']).dicts().get()
    elif 'name' in param:
        scanmethods()
        method = analysis_method.select().where(analysis_method.description == name).order_by(analysis_method.creation_date.desc()).dicts().get()
    else:
        return fr()({'error': 'No analysis method specified.'})
    return fr()(queue_analysis(param['vid'], method))

app = application = bottle.default_app()

if __name__ == '__main__':
    bottle.run(host = '0.0.0.0', port = 8080, debug = True)
