README-server.md

pip install bottle
pip install peewee

## To empty the database:

```
> sqlite3 eyesea.db
sqlite> .tables
sqlite> delete from analysis;
sqlite> delete from analysis_method;
sqlite> delete from video;
ctrl-D
```