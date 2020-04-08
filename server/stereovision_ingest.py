# Python script to scan directory structure of StereoVision system data files.
# The StereoVision system was designed and built by Marine Situ for the ORPC
# Igiugig project.  Two stereo pairs of cameras were installed on a RivGen 
# instream turbine and the device was deployed in Kvichak river in October 2019.

# The directory structure is as follows:
# day
#  |--time (every few minutes)
#      |--Camera Pair 1 Settings.txt
#      |--Camera Pair 2 Settings.txt
#      |--Camera X (4)
#          |--Timestamps.txt
#          |--YYYY_MM_DD_hh_mm_ss.ff.jpg (images)
#

# The settings files can be used to get the frame rate.  If the frame rate is 0,
# then the camera pair was not recording.
# Example settings file:
'''
8/1/2019, 9:54:05 AM

Auto-Frame Rate Enabled: 0
Frame Rate 1 [Hz]: 10.00
Frame Rate 2 [Hz]: 10.00

Auto-Exposure Enabled: 1
Exposure 1 [ms]: 3.28
Exposure 2 [ms]: 3.35

Auto-Gain Enabled: 1
Gain 1: 0.00
Gain 2: 0.00
Gamma: 0.80
'''

import os
import glob
import ffmpeg
import sys
import time
import subprocess


# Parse the settings file and return:
# dt: date time
# fps: frames per second, 0 -> camera pair was not enabled, 1 -> auto 
# exp: exposure, 1 -> auto
# gain: gain, 1 -> auto
def parse_camera_settings(timedir):
    # TODO: Actually parse the files
    files = ["Camera Pair 1 Settings.txt", "Camera Pair 2 Settings.txt"]
    dt = [0, 0, 0, 0]
    fps = [0, 0, 10.0, 10.0]
    exp = [1, 1, 1, 1]
    gain = [1, 1, 1, 1]
    return dt, fps, exp, gain
# parse_settings()

# make an mp4 video out of image files
# using python bindings for ffmpeg:
# https://github.com/kkroening/ffmpeg-python/tree/master/examples
# ffmpeg tuning:
# https://trac.ffmpeg.org/wiki/Encode/H.264
def make_movie(imgpath,fps,outfile):
    (
        ffmpeg
        .input(os.path.join(imgpath,'*.jpg'), pattern_type='glob', framerate=fps)
        .output(outfile 
            ,vcodec='libx264'
            ,crf=17
            ,pix_fmt='yuv420p'
            )
        .overwrite_output()
        .run()
    )
# make_movie()

if __name__ == "__main__":

    from datetime import datetime
    import configargparse

    from eyesea_db import *

    print("")
    print("Starting...")

    # start the clock
    start_time = datetime.now()

    # Get runtime argsif args.xml: api.put_results_xml(idx, detections)
    p = configargparse.ArgParser(default_config_files=['./.stereovision', '~/.stereovision'])
    p.add('-c', required=False, is_config_file=True, help='config file path')
    # options that start with '--' can be set in the config file
    p.add('-d', '--datadir', required=True, help='root of data directories')  
    p.add('-f', help='force processing if data was already processed', action='store_true')
    #p.add('-v', help='verbose', action='store_true')
    #p.add('-d', '--dbsnp', help='known variants .vcf', env_var='DBSNP_PATH')  
    #p.add('vcf', nargs='+', help='variant file(s)')
    options = p.parse_args()
    print(p.format_values()) 

    rootdir = options.datadir
    force = options.f

    settings = json.loads(open('eyesea_settings.json').read())

    vdir = os.path.abspath(settings['video_storage'])
    if not os.path.isdir(vdir):
        os.mkdir(vdir)

    tmp = os.path.abspath(settings['temporary_storage'])
    if not os.path.isdir(tmp):
        os.mkdir(tmp)

    # TODO: get from settings
    # assume we are running in the eyesea/server dir
    algdir = os.path.join(os.path.dirname(os.getcwd()),'algorithms')
    print('Algorithm dir is ' + algdir)

    # get analysis method to use
    # TODO: get this from args
    algname = 'bgMOG2'
    try:
        method = analysis_method.select().where(
            analysis_method.description.contains(algname)
            ).dicts().get()
    except DoesNotExist:
        print("Adding analysis method {} to database".format(algname))
        algjsonfile = os.path.join(algdir, algname + '.json')
        fdict = json.loads(open(algjsonfile).read())
        fjson = json.dumps(fdict)  # normalize json
        method = analysis_method.select().where(
            analysis_method.mid==analysis_method.insert(
                creation_date = int(time.time())
                , description = fdict['name']
                , parameters = fjson
                , automated = True
                , path = algdir 
                ).execute()).dicts().get()
    # the method id
    mid = method['mid']
    base_args = json.loads(method['parameters'])
    script = '{p}/{f}'.format(p=method['path'] if method['path']
                                  else algdir, f=base_args['script'])
    # cd to algorithm dir
    working_dir = os.getcwd()
    os.chdir(algdir)

    nsec = 0
    nbytes = 0
    video_files = []
    video_fps = []
    video_dur = []
    analysis_proc = []
    analysis_results = []

    # get list of day directories
    daydirs = glob.glob(os.path.join(rootdir,'????_??_??'))
    print("Found {} days".format(len(daydirs)))
    for day in daydirs:
        print(day)
        # get list of time directories
        timedirs = glob.glob(os.path.join(day,'????_??_?? ??_??_??'))
        print("Found {} times".format(len(timedirs)))
        for t in timedirs:
            print(t)
            # read settings
            dt, fps, exp, gain = parse_camera_settings(t)

            # if there's data
            for cam in range(1,5):
                imgpath = os.path.join(t,'Camera {:d}'.format(cam))
                imgs = glob.glob(os.path.join(imgpath,'*.jpg'))
                print("Camera {:d} has {:d} images".format(cam, len(imgs)))
                if len(imgs) > 0:
                    vidfile = os.path.join(vdir, os.path.basename(t) + '_Cam{:d}.mp4'.format(cam))
                    if os.path.exists(vidfile) and not force: continue
                    if not os.path.exists(vidfile):
                        print("Making movie {}".format(vidfile))
                        make_movie(imgpath,fps[cam-1],vidfile)
                    # store movie path for ingest
                    video_files.append(vidfile)
                    video_fps.append(fps[cam-1])
                    video_dur.append(len(imgs) / fps[cam-1])
                    nsec = nsec + len(imgs) / fps[cam-1]
                    # process data with algorithm
                    print("Finding fish... ")
                    outfile = os.path.join(tmp, os.path.basename(t) + '_Cam{:d}.json'.format(cam))
                    args = ['python', script, imgpath, outfile]
                    p = subprocess.Popen(args, bufsize=-1)
                    analysis_proc.append(p)
                    analysis_results.append(outfile)

    os.chdir(working_dir)

    # ingest data into EyeSea database
    for vf,fr,dur,p,res in zip(video_files,video_fps,video_dur,analysis_proc,analysis_results):
        print("Ingesting {} into EyeSea database".format(os.path.basename(vf)))
        data = video.select().where(
            video.vid==video.insert(
                filename = vf
                , duration = dur
                , description = os.path.splitext(os.path.basename(vf))[0]
                , fps = fr
                , width = 0
                , height = 0
                , variable_framerate = False
                , uri = 'file://' + vf
                ).execute()).dicts().get()
        vid = data['vid']
        # wait for the processing to complete
        # TODO: may want to set a timeout value
        p.wait() 
        results = ''
        status = 'FAILED'
        if p.returncode == 0:
            print('    got results')
            status = 'FINISHED'
            with open(res) as f:
                output = json.loads(f.read())['frames']
                results = json.dumps(output, separators=(',', ':'))
        data = analysis.select().where(
            analysis.aid==analysis.insert(
                mid = mid
                , vid = vid
                , status = status
                , parameters = ''
                , results = results
                ).execute()).dicts().get()


    # get elapsed time
    time_elapsed = datetime.now() - start_time
    print("")
    print("Data Summary")
    print("{:d} videos".format(len(video_files)))
    print("{:.1f} minutes of video".format(nsec/60.0))
    print("{:.3f} Mb of data".format(nbytes/1e6))
    print("")
    print('Elapsed time (hh:mm:ss.ms): {}'.format(time_elapsed))
    print(" ")

