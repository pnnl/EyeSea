import { combineReducers } from 'redux-immutable';
import { fromJS } from 'immutable';
import { createSelector } from 'reselect';
import { fromError, createToJSSelector } from './util/redux';
import { reducer as videos } from './videos';

///-- ACTIONS --///
const reducer = (state = fromJS({}), action) => {
	const { type, payload } = action;
	switch (type) {
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
