# Welcome to EyeSea!
# Install EyeSea

## Get the source
Clone  or download the project from 
https://github.com/pnnl/EyeSea.git


## Set up environment

You'll need to have  [node](https://nodejs.org/en/) installed in your system.

Then install the dependencies:
npm install -g yarn
npm install --save highcharts
npm install --save lodash
npm install -g highcharts highcharts-react-official
```

```
yarn install
```

```
yarn add whatwg-fetch
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
eyJoaXN0b3J5IjpbMTA4MzczNjU0OSwtNjkzMzMzOTMxXX0=
-->