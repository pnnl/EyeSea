import { fromJS } from 'immutable';
import { fromError, createToJSSelector } from '../util/redux';

export const REQUEST = 'app/videos/request';
export const SUCCESS = 'app/videos/success';
export const ERROR = 'app/videos/error';

export const SORT = 'app/videos/sort';

///-- ACTIONS --///
export function request() {
	return {
		type: REQUEST,
		servicePath: true,
	};
}

export function setSort(payload) {
	return {
		type: SORT,
		payload,
	};
}

const initialState = {
	[SORT]: {
		property: 'Added Date',
		ascending: false,
	},
};
const reducer = (state = fromJS(initialState), action) => {
	const { type, payload } = action;
	switch (type) {
		case SUCCESS:
		case SORT:
			return state.set(type, fromJS(payload));
		case ERROR:
			return state.set(type, fromError(payload));
		default:
			return state;
	}
};

export default reducer;

///-- SELECTORS --///
var getKeyImmutable = key => state => state.getIn(['app', 'videos', key]);

export const getVideos = createToJSSelector(getKeyImmutable(SUCCESS));
export const getVideosError = createToJSSelector(getKeyImmutable(ERROR));

export const getSort = createToJSSelector(getKeyImmutable(SORT));
