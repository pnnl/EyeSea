import { fromJS } from 'immutable';
import { createSelector } from 'reselect';
import {
	fromError,
	createIdentitySelector,
	createToJSSelector,
} from '../util/redux';
import _ from 'lodash';

export const REQUEST = 'app/dataset/request';
export const SUCCESS = 'app/dataset/success';
export const ERROR = 'app/dataset/error';

export const DATASET = 'app/dataset/set';


///-- ACTIONS --///
export function request(payload) {
	return {
		type: REQUEST,
		servicePath: true,
		payload,
	};
}

export function setDataset(payload) {
    return {
        type: DATASET,
        servicePath: true,
        payload,
    };
}

const reducer = (state = fromJS({}), action) => {
	const { type, payload } = action;
	switch (type) {
		case SUCCESS:
        case DATASET:
			return state.set(type, fromJS(payload));
		case ERROR:
			return state.set(type, fromError(payload));
		default:
			return state;
	}
};

export default reducer;

///-- SELECTORS --///
var getKeyImmutable = key => state => state.getIn(['app', 'dataset', key]);

export const getDatasets = createToJSSelector(getKeyImmutable(SUCCESS));
export const getError = createToJSSelector(getKeyImmutable(ERROR));

export const getSelected = createToJSSelector(getKeyImmutable(DATASET));

