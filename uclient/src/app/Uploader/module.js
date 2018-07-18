import { fromJS } from 'immutable';
import { createSelector } from 'reselect';
import {
	fromError,
	createIdentitySelector,
	createToJSSelector,
} from '../util/redux';
import _ from 'lodash';

export const REQUEST = 'app/uploader/request';
export const SUCCESS = 'app/uploader/success';
export const ERROR = 'app/uploader/error';

export const FILES = 'app/uploader/files';
export const DESCRIPTION = 'app/uploader/description';

export const ALGORITHMS = 'app/uploader/algorithms';
export const ALGORITHM_ADD = 'app/uploader/addAlgorithm';
export const ALGORITHM_DEL = 'app/uploader/removeAlgorithm';
export const ALGORITHM_ENABLE = 'app/uploader/enableAlgorithm';
export const ALGORITHM_ALLOW_PARAMETERS = 'app/uploader/parameterizeAlgorithm';
export const ALGORITHM_PARAMETERS = 'app/uploader/algorithmParameters';

///-- ACTIONS --///
export function request(payload) {
	return {
		type: REQUEST,
		servicePath: true,
		payload,
	};
}

export function setFiles(payload) {
	return {
		type: FILES,
		payload,
	};
}

export function setDescription(payload) {
	return {
		type: DESCRIPTION,
		payload,
	};
}

export function addAlgorithmInstance(payload) {
	return {
		type: ALGORITHM_ADD,
		payload,
	};
}

export function deleteAlgorithmInstance(payload) {
	return {
		type: ALGORITHM_DEL,
		payload,
	};
}

export function enableAlgorithmInstance(key, value) {
	return {
		type: ALGORITHM_ENABLE,
		payload: {
			key,
			value,
		},
	};
}

export function enableCustomAlgorithmInstanceParameters(key, value) {
	return {
		type: ALGORITHM_ALLOW_PARAMETERS,
		payload: {
			key,
			value,
		},
	};
}

export function setCustomAlgorithmInstanceParameters(key, value) {
	return {
		type: ALGORITHM_PARAMETERS,
		payload: {
			key,
			value,
		},
	};
}

const initialState = {
	[ALGORITHMS]: [],
};
let id = 0;

const reducer = (state = fromJS(initialState), action) => {
	const { type, payload } = action;
	switch (type) {
		case FILES:
			// FileList is already Immutable (though this may not hold for the future)
			return state.set(type, payload).delete(DESCRIPTION);
		case DESCRIPTION:
			// string is already immutable
			return state.set(type, payload);
		case ALGORITHM_ADD:
			return state.update(ALGORITHMS, list =>
				list.push(
					fromJS(
						_.extend(
							{
								id: id++,
							},
							payload
						)
					)
				)
			);
		case ALGORITHM_DEL:
			return state.update(ALGORITHMS, list =>
				list.delete(
					list.findIndex(algorithm => algorithm.get('id') === payload.id)
				)
			);
		case ALGORITHM_ENABLE:
			return state.update(ALGORITHMS, list =>
				list.setIn(
					[
						list.findIndex(algorithm => algorithm.get('id') === payload.key.id),
						'disabled',
					],
					!payload.value
				)
			);
		case ALGORITHM_ALLOW_PARAMETERS:
			return state.update(ALGORITHMS, list =>
				list.setIn(
					[
						list.findIndex(algorithm => algorithm.get('id') === payload.key.id),
						'allowParameters',
					],
					payload.value
				)
			);
		case ALGORITHM_PARAMETERS:
			return state.update(ALGORITHMS, list =>
				list.setIn(
					[
						list.findIndex(algorithm => algorithm.get('id') === payload.key.id),
						'parameters',
					],
					payload.value
				)
			);
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
var getKeyImmutable = key => state => state.getIn(['app', 'uploader', key]);

export const getFiles = createIdentitySelector(getKeyImmutable(FILES));
export const getDescription = createIdentitySelector(getKeyImmutable(DESCRIPTION));

export const getAlgorithmInstances = createToJSSelector(
	getKeyImmutable(ALGORITHMS)
);

export const getResult = createToJSSelector(getKeyImmutable(SUCCESS));
export const getError = createToJSSelector(getKeyImmutable(ERROR));
