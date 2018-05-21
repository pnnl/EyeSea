import { combineReducers } from 'redux-immutable';
import { fromJS } from 'immutable';
import { createSelector } from 'reselect';
import { fromError, createToJSSelector } from './util/redux';
import { reducer as videos } from './Videos';

export const SERVICE_PATH = 'app/servicePath';

///-- ACTIONS --///
export function setServicePath(payload) {
	return {
		type: SERVICE_PATH,
		payload,
	};
}

const reducer = (state = fromJS({}), action) => {
	const { type, payload } = action;
	switch (type) {
		case SERVICE_PATH:
			return state.merge({
				[type]: fromJS(payload.endsWith('/') ? payload : payload + '/'),
			});
		default:
			return state;
	}
};

export default combineReducers({
	reducer,
	videos,
});

///-- SELECTORS --///
var getKeyImmutable = key => state => state.getIn(['app', 'reducer', key]);

export const getServicePath = getKeyImmutable(SERVICE_PATH);
