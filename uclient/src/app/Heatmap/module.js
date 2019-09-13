import { fromJS } from 'immutable';
import { createSelector } from 'reselect';
import { fromError, createToJSSelector } from '../util/redux';

export const REQUEST = 'app/heatmap/request';
export const SUCCESS = 'app/heatmap/success';
export const ERROR = 'app/heatmap/error';

///-- ACTIONS --///
export function request(payload) {
	return {
		type: REQUEST,
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
		default:
			return state;
	}
};

export default reducer;

///-- SELECTORS --///
var getKeyImmutable = key => state => state.getIn(['app', 'heatmap', key]);

export const getHeatmap = createToJSSelector(getKeyImmutable(SUCCESS));
export const getHeatmapError = createToJSSelector(getKeyImmutable(ERROR));
