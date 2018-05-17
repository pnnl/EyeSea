import { createStore, applyMiddleware } from 'redux';
import { combineReducers } from 'redux-immutable';
import thunk from 'redux-thunk';
import createSagaMiddleware from 'redux-saga';
import { composeWithDevTools } from 'redux-devtools-extension';

import sagas from './sagas/sagas';
import app from './app/module';

const sagaMiddleware = createSagaMiddleware();

let middleware = [thunk, sagaMiddleware];
if (process.env.NODE_ENV !== 'production') {
	const composeEnhancers = composeWithDevTools({
		/*Options*/
	});
	middleware = composeEnhancers(applyMiddleware(...middleware));
} else {
	middleware = applyMiddleware(...middleware);
}

const store = createStore(
	combineReducers({
		app,
	}),
	middleware
);
export default store;

sagaMiddleware.run(sagas);
