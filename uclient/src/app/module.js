import { combineReducers } from 'redux-immutable';
import { fromJS } from 'immutable';
import { createSelector } from 'reselect';
import { fromError, createToJSSelector } from './util/redux';
import { reducer as videos } from './Videos';
import { reducer as video } from './Video';

export const SERVICE_PATH = 'app/servicePath';

export const METHODS_REQUEST = 'app/methods/request';
export const METHODS_SUCCESS = 'app/methods/success';
export const METHODS_ERROR = 'app/methods/error';
export const METHODS_BY_ID = 'app/methods/byId';

///-- ACTIONS --///
export function setServicePath(payload) {
	return {
		type: SERVICE_PATH,
		payload,
	};
}

export function requestAnalysisMethods() {
	return {
		type: METHODS_REQUEST,
	};
}

const colors = [
	'#fe4040',
	'#32e0fb',
	'#de2cf7',
	'#2fff97',
	'#606efd',
	'#bbfd23',
];

const reducer = (state = fromJS({}), action) => {
	const { type, payload } = action;
	switch (type) {
		case SERVICE_PATH:
			return state.set(
				type,
				fromJS(payload.endsWith('/') ? payload : payload + '/')
			);
		case METHODS_SUCCESS:
			let methods = {};
			let color = 0;
			payload.forEach(method => {
				method.color = colors[color++];
				methods[method.mid] = method;
			});
			return state
				.set(type, fromJS(payload))
				.set(METHODS_BY_ID, fromJS(methods));
		case METHODS_ERROR:
			return state.set(type, fromError(payload));
		default:
			return state;
	}
};

export default combineReducers({
	reducer,
	videos,
	video,
});

///-- SELECTORS --///
var getKeyImmutable = key => state => state.getIn(['app', 'reducer', key]);

export const getServicePath = getKeyImmutable(SERVICE_PATH);

export const getAnalysisMethods = createToJSSelector(
	getKeyImmutable(METHODS_SUCCESS)
);
export const getAnalysisMethodsById = createToJSSelector(
	getKeyImmutable(METHODS_BY_ID)
);
export const getAnalysisMethodsError = createToJSSelector(
	getKeyImmutable(METHODS_ERROR)
);
