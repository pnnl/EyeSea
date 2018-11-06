import { fromJS } from 'immutable';
import { createSelector } from 'reselect';
import {
	fromError,
	createToJSSelector,
	createIdentitySelector,
} from '../util/redux';

export const REQUEST = 'app/video/request';
export const ANN = 'app/video/ann';
export const ANNERROR = 'app/video/annerror';
export const ANNSUCCESS = 'app/video/annsuccess';
export const SUCCESS = 'app/video/success';
export const ERROR = 'app/video/error';

///-- ACTIONS --///
export function request(payload) {
	return {
		type: REQUEST,
		servicePath: true,
		payload,
	};
}

export function ann(payload) {
	return {
		type: ANN,
		servicePath: true,
		payload,
	};
}

const reducer = (state = fromJS({}), action) => {
	const { type, payload } = action;
	switch (type) {
		case SUCCESS:
			return state.set(type, fromJS(payload));
		case ERROR:
			return state.set(type, fromError(payload));
		case ANNSUCCESS:
			return state.set(type, fromJS(payload));
		default:
			return state;
	}
};

export default reducer;

///-- SELECTORS --///
var getKeyImmutable = key => state => state.getIn(['app', 'video', key]);

export const getVideo = createToJSSelector(getKeyImmutable(SUCCESS));
export const getVideoError = createToJSSelector(getKeyImmutable(ERROR));
export const getAnns = createIdentitySelector(getKeyImmutable(ANN));
