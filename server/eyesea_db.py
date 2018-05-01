#!/usr/bin/env python
from peewee import *

db = SqliteDatabase('eyesea.db')

class eyesea_model(Model):
    class Meta:
        database = db
    
class video(eyesea_model):
    vid = IntegerField(primary_key=True)
    description = TextField()
    filename = CharField()
    fps = IntegerField()
    variable_framerate = SmallIntegerField()
    uri = CharField()

class analysis(eyesea_model):
    aid = IntegerField(primary_key=True)
    vid = IntegerField()
    status = CharField()
    parameters = TextField()
    results = TextField()

class analysis_method(eyesea_model):
    mid = IntegerField(primary_key=True)
    description = TextField()
    parameters = TextField()
    results = TextField()
