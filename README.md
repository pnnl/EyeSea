# Welcome to EyeSea!
# Install EyeSea

## Get the source
Clone  or download the project from 
https://github.com/pnnl/EyeSea.git


## Set up environment
Install [conda](https://docs.conda.io/en/latest/miniconda.html) for managing environments.
Then install install dependencies:
```
cd $EYESEA_ROOT/uclient
conda 
```
You'll need to have  [node](https://nodejs.org/en/) installed in your system.

Then install the dependencies:
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
eyJoaXN0b3J5IjpbLTExNDk4NDc3MzYsMTA4MzczNjU0OSwtNj
kzMzMzOTMxXX0=
-->