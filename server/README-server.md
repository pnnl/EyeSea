README-server.md

## Install dependencies

Python modules:
numpy, matplotlib, PIL (actually Pillow)

Other:
ffmpeg

```
> pip install Cython
> pip install bottle
> pip install peewee
```

## Edit the settings file

```
> vi eyesea_settings.json
```

## Start the server

```
> python eyesea_server.py
```

## To empty the database:

```
> sqlite3 eyesea.db
sqlite> .tables
sqlite> delete from analysis;
sqlite> delete from analysis_method;
sqlite> delete from video;
ctrl-D
```
