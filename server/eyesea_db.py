#!/usr/bin/env python
import json # settings file
from peewee import * # database connection

#settings = json.loads(open('eyesea_settings.json').read())
#db = SqliteDatabase(settings['database'])
# importing module sets db
db = SqliteDatabase(None)

class eyesea_model(Model):
    class Meta:
        database = db
    
class video(eyesea_model):
    # ID generated automatically
    vid = IntegerField(primary_key=True)
    # displayed with video
    description = TextField()
    # original file name used for info mouseover in video view
    filename = CharField()
    # frames per second (a.k.a. frame rate)
    fps = IntegerField()
    variable_framerate = SmallIntegerField()
    # duration in seconds
    duration = FloatField()
    # full path to uploaded video file
    uri = CharField()
    # date added to database?
    creation_date = IntegerField()
    width = IntegerField()
    height = IntegerField()
    # filename of thumnail image in .cache
    #thumbnail = CharField()

class analysis(eyesea_model):
    aid = IntegerField(primary_key=True)
    mid = IntegerField()
    vid = IntegerField()
    status = CharField()
    parameters = TextField()
    results = TextField()

class analysis_method(eyesea_model):
    mid = IntegerField(primary_key=True)
    description = TextField()
    automated = BooleanField()
    parameters = TextField()
    path = TextField()
    creation_date = IntegerField()

def create_tables():
    with db:
        db.create_tables([video, analysis, analysis_method])
