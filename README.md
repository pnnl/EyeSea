### Install EyeSea

* You'll need to have [git](https://git-scm.com/) and [node](https://nodejs.org/en/) installed in your system.
* Clone the project:

```
git clone https://github.com/pnnl/EyeSea.git
```

* Then install the dependencies:

If you already have yarn, you can skip this step.


```
npm install -g yarn
```

```
yarn install
```

```
yarn add whatwg-fetch
```

Python modules:
numpy, matplotlib, PIL (actually Pillow)

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

