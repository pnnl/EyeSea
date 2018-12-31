#!/usr/bin/env python
import json
from peewee import *

settings = json.loads(open('eyesea_settings.json').read())
db = SqliteDatabase(settings['database'])

class eyesea_model(Model):
    class Meta:
        database = db
    
class video(eyesea_model):
    vid = IntegerField(primary_key=True)
    description = TextField()
    filename = CharField()
    fps = IntegerField()
    variable_framerate = SmallIntegerField()
    duration = FloatField()
    uri = CharField()
    creation_date = IntegerField()

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
