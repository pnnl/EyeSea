# Welcome to EyeSea!
# Install EyeSea

## Get the source
Clone  or download the project from 
https://github.com/pnnl/EyeSea.git


## Set up environment
Install [conda](https://docs.conda.io/en/latest/miniconda.html) for managing environments.
Then install install dependencies:
client
```
cd $EYESEA_ROOT/uclient
conda env create -f env-eyesea-client.yml
```
This will install  [node](https://nodejs.org/en/)  in your system.

Then use npm to install the dependencies:
```
npm install -g yarn
```
```
yarn install
```

Python modules:
numpy, matplotlib, Pillow

Other:
ffmpeg, sqlite

```
> pip install Cython
> pip install bottle
> pip install peewee
```


### Start EyeSea server

```
cd EyeSea/server

python eyesea_server.py 
```

### Start EyeSea client

```
cd EyeSea/uclient
```

* Run development server:

```
yarn start
```

* Or you can run development server with [webpack-dashboard](https://github.com/FormidableLabs/webpack-dashboard):

```
yarn dev
```


* To build the production package

```
yarn build
```

### Use EyeSea in browser

Open your web browser to `http://localhost:7890/`

<!--stackedit_data:
eyJoaXN0b3J5IjpbMTkxMTE5MzUxNCwxMDgzNzM2NTQ5LC02OT
MzMzM5MzFdfQ==
-->