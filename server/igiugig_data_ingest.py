# Python script to scan directory structure of Stereo Vision system data files.
# The Stereo Vision system was designed and built by Marine Situ for the ORPC
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

# Parse the settings file and return:
# dt: date time
# fps: frames per second, 0 -> camera pair was not enabled, 1 -> auto 
# exp: exposure, 1 -> auto
# gain: gain, 1 -> auto
def parse_settings(timedir):
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
    # NOTES: the movie quality is pretty bad compared to the raw images.
    # There are very noticable compression artifacts, blockiness.  
    # ffmpeg output when trying to apply -crf 0:
    '''
    Input #0, image2, from '/Users/d3x389/Downloads/EyeSea/ORPC-2019/2019_08_03/2019_08_03 09_44_03/Camera 4/*.jpg':
    Duration: 00:00:10.00, start: 0.000000, bitrate: N/A
    Stream #0:0: Video: mjpeg, gray(bt470bg/unknown/unknown), 2048x1536 [SAR 1:1 DAR 4:3], 10 fps, 10 tbr, 10 tbn, 10 tbc
    Codec AVOption crf (Select the quality for constant quality mode) specified for output file #0 (/Users/d3x389/Downloads/EyeSea/ORPC-2019/2019_08_03/2019_08_03 09_44_03_Cam4.mp4) has not been used for any stream. The most likely reason is either wrong type (e.g. a video option with no video streams) or that it is a private option of some encoder which was not actually used for any stream.
    '''
    # solution?:
    # https://superuser.com/questions/1429256/producing-lossless-video-from-set-of-png-images-using-ffmpeg
    # I think converting from 16-bit grayscale to 8-bit grayscale is happening and ruining the smoothness
    (
        ffmpeg
        .input(os.path.join(imgpath,'*.jpg'), pattern_type='glob', framerate=fps)
        # set crf=0 for lossless but may be incompatible with players
        # use the copy codec to just use the images as is, but may not be 
        # compatible with players (VLC ok)
        .output(outfile 
           ,vcodec='copy' 
            )
        .run()
    )
# make_movie()

if __name__ == "__main__":

    from datetime import datetime
    import configargparse

    print("")
    print("Starting...")

    # start the clock
    start_time = datetime.now()

    # Get runtime args
    p = configargparse.ArgParser(default_config_files=['./.igiugig', '~/.igiugig'])
    p.add('-c', '--my-config', required=False, is_config_file=True, help='config file path')
    # options that start with '--' can be set in the config file
    p.add('--root', required=True, help='root of data directories')  
    p.add('--dbfile', required=True, help='EyeSea database file')  
    p.add('-f', help='force processing', action='store_true')
    #p.add('-v', help='verbose', action='store_true')
    #p.add('-d', '--dbsnp', help='known variants .vcf', env_var='DBSNP_PATH')  
    #p.add('vcf', nargs='+', help='variant file(s)')
    options = p.parse_args()
    print(p.format_values()) 

    # root data directory
    rootdir = options.root
    dbfile = options.dbfile

    nsec = 0
    nbytes = 0
    video_files = []
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
            dt, fps, exp, gain = parse_settings(t)

            # if there's data
            for cam in range(1,5):
                imgpath = os.path.join(t,'Camera {:d}'.format(cam))
                imgs = glob.glob(os.path.join(imgpath,'*.jpg'))
                print("Camera {:d} has {:d} images".format(cam, len(imgs)))
                if len(imgs) > 0:
                    outfile = os.path.join(day, os.path.basename(t) + '_Cam{:d}.mp4'.format(cam))
                    if os.path.exists(outfile): continue
                    print("Making movie {}".format(outfile))
                    make_movie(imgpath,fps[cam-1],outfile)
                    # store movie path for ingest
                    video_files.append(outfile)
                    nsec = nsec + len(imgs) / fps[cam-1]

    # ingest movies into EyeSea database
    import sys
    sys.path.append(os.path.join('..','server'))
    from eyesea_db import *

    for vf in video_files:
        print("Ingesting {} into EyeSea database".format(vf))

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

