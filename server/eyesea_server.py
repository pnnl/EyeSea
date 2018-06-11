#!/usr/bin/env python
import json
import bottle
import os
from subprocess import check_output, Popen, PIPE
from bottle import request, response, post, get, put, delete, hook, route, static_file
from eyesea_db import *

eye_env = os.environ
eye_env["PATH"] = '/home/avil982/Code/videofish_dev/evaluation/:' + eye_env["PATH"]
tasklist = {}

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

@hook('after_request')
def ar():
    db.close()
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'PUT, GET, POST, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token'

@get('/statistics')
def get_statistics():
    data = {'total_videos' : len(video.select()),
            'total_analyses' : len(analysis.select()),
            'total_analyses_completed' : len(analysis.select().where(analysis.status == 'done')),
            'total_analyses_failed' : len(analysis.select().where(analysis.status == 'failed')),
            'total_analyses_queued' : len(analysis.select().where(analysis.status == 'queued'))
            }
    return fr()(data)

@get('/video')
def get_video():
    data = (video.select(video, analysis.aid, analysis.status, analysis.results)
        .join(analysis, on=(video.vid == analysis.vid))
        .dicts())
    data = [(lambda vid, results: {
        'id': vid['vid'],
        'description': vid['description'],
        'fps': vid['fps'],
        'length': results[-1]['frameindex'] / vid['fps'],
        'variableFramerate': vid['variable_framerate'],
        'uri': vid['uri'],
        'analysis': {
            'id': vid['aid'],
            'status': vid['status'],
            'results': [
                {
                    'detections': frame['detections'],
                    'frameIndex': frame['frameindex']
                } for frame in results
            ]
        }
    })(i, json.loads(i['results'])) for i in data]
    return fr()(data)

@get('/videos')
def get_videos():
    data = (video.select(video, analysis.aid, analysis.status, analysis.results)
        .join(analysis, on=(video.vid == analysis.vid))
        .dicts())
    data = [(lambda vid, results: {
        'id': vid['vid'],
        'description': vid['description'],
        'fps': vid['fps'],
        'length': results[-1]['frameindex'] / vid['fps'],
        'variableFramerate': vid['variable_framerate'],
        'uri': vid['uri'],
        'analysis': {
            'id': vid['aid'],
            'status': vid['status'],
            'results': [
                {
                    'detections': len(frame['detections']),
                    'frameIndex': frame['frameindex']
                } for frame in results if len(frame['detections']) > 0
            ]
        }
    })(i, json.loads(i['results'])) for i in data]
    return fr()(data)

@get('/videos')
def get_videos():
    data = (video.select(video, analysis.aid, analysis.status, analysis.results)
        .join(analysis, on=(video.vid == analysis.vid))
        .dicts())
    return fr()({'data': [i for i in data]})

@post('/video')
def post_video():
    data = video.select().where(video.vid==video.insert(request.json).execute()).dicts().get()
    return fr()(data)

@get('/video/<vid>')
def get_video_vid(vid):
    data = video.select().where(video.vid == vid).dicts().get()
    return fr()(data)

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
    if aid.isdigit() and int(aid) in tasklist:
        p = tasklist[int(aid)]['p'].poll()
        data = analysis.select().where(analysis.aid == aid).dicts().get()
        param = json.loads(data['parameters'])
        if p is not None:
            if tasklist[int(aid)]['output'] != 'STDOUT':
                analysis.update({'status' : 'FINISHED', 'results' : json.dumps(open(tasklist[int(aid)]['output']).read())}).where(analysis.aid == aid).execute()
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

@route('/file/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root='/')

@post('/process')
def process_video():
    param = request.json
    if ("vid" in param and "mid" in param):
        method = analysis_method.select().where(analysis_method.mid == param["mid"]).dicts().get()
        procargs = json.loads(method['parameters'])
        vid = video.select().where(video.vid == param["vid"]).dicts().get()
        if 'file://' in vid['uri']:
            output = vid['uri'].replace('file://', '').split('.')[0] + '.json'
            args = [procargs['command'], procargs['videoarg'], vid['uri'].replace('file://', ''), procargs['outputarg'], output]
            aid = analysis.select().where(analysis.aid==analysis.insert({'mid': param['mid'], 'vid': param['vid'], 'status': 'QUEUED', 'parameters': json.dumps(args), 'results' : ''}).execute()).dicts().get()
            print args
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
    bottle.run(host = '127.0.0.1', port = 8080, debug = True)
