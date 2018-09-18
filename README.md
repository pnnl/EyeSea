
### Install EyeSea

* You'll need to have [git](https://git-scm.com/) and [node](https://nodejs.org/en/) installed in your system.
* Fork and clone the project:

```
git clone https://stash.pnnl.gov/scm/videofish/videofish.git
cd eyesea_v2/uclient
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

### Start EyeSea server

cd eyesea/server

python eyesea_server.py 

### Start EyeSea client

```

* Run development server:

```
yarn start
```

* Or you can run development server with [webpack-dashboard](https://github.com/FormidableLabs/webpack-dashboard):

```
yarn dev
```


### To build the production package

```
yarn build
```

### Use EyeSea in browser

Open the web browser to `http://localhost:7890/`


