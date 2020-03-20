# Updated EyeSea Client

### To run

* You'll need to have [git](https://git-scm.com/) and [node](https://nodejs.org/en/) installed in your system.
* Fork and clone the project:

```
git clone https://stash.pnnl.gov/scm/videofish/videofish.git
cd eyesea_v2/uclient
```

* Then install the dependencies:

If you already have webpack and yarn, you can skip this step.

```
npm install webpack-dev-server -g
npm install -g yarn
```

* Build the modules
```
yarn
```

* Run development server:

```
yarn start
```

* Or you can run development server with [webpack-dashboard](https://github.com/FormidableLabs/webpack-dashboard):

```
yarn dev
```

Open the web browser to `http://localhost:7890/`

### To build the production package

```
yarn build
```

