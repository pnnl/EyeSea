import { fromJS } from 'immutable';
import { createSelector } from 'reselect';
import { fromError, createToJSSelector } from '../util/redux';

export const REQUEST = 'app/videos/request';
export const SUCCESS = 'app/videos/success';
export const ERROR = 'app/videos/error';

///-- ACTIONS --///
export function request(payload) {
	return {
		type: REQUEST,
		payload,
	};
}

const reducer = (state = fromJS({}), action) => {
	const { type, payload } = action;
	switch (type) {
		case SUCCESS:
			return state.merge({
				[type]: fromJS(payload),
			});
		case ERROR:
			return state.merge({
				[type]: fromError(payload),
			});
		default:
			return state;
	}
};

export default reducer;

///-- SELECTORS --///
var getKeyImmutable = key => state => state.getIn(['app', 'videos', key]);

export const getVideos = createToJSSelector(getKeyImmutable(SUCCESS));
export const getVideosError = createToJSSelector(getKeyImmutable(ERROR));
