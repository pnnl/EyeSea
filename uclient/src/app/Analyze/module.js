import { fromJS } from 'immutable';
import { createSelector } from 'reselect';
import {
	fromError,
	createIdentitySelector,
	createToJSSelector,
} from '../util/redux';
import _ from 'lodash';

export const REQUEST = 'app/analyze/request';
export const SUCCESS = 'app/analyze/success';
export const ERROR = 'app/analyze/error';
export const ERROR_DISMISS = 'app/analyze/errorDismiss';

export const ANALYZE = 'app/analyze/analyze';
export const DESCRIPTION = 'app/analyze/description';
export const RESET = 'app/analyze/reset';

export const ALGORITHMS = 'app/analyze/algorithms';
export const ALGORITHM_ADD = 'app/analyze/addAlgorithm';
export const ALGORITHM_DEL = 'app/analyze/removeAlgorithm';
export const ALGORITHM_ENABLE = 'app/analyze/enableAlgorithm';
export const ALGORITHM_ALLOW_PARAMETERS = 'app/analyze/parameterizeAlgorithm';
export const ALGORITHM_PARAMETERS = 'app/analyze/algorithmParameters';

///-- ACTIONS --///
export function request(payload) {
	return {
		type: REQUEST,
		servicePath: true,
		payload,
	};
}

export function popAnalyze(payload) {
	return {
		type: ANALYZE,
		payload,
	};
}

export function reset() {
	return {
		type: RESET,
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

export function setCustomAlgorithmInstanceParameters(key, value, dirty) {
	return {
		type: ALGORITHM_PARAMETERS,
		payload: {
			key,
			value,
			dirty,
		},
	};
}

export function dismissError() {
	return {
		type: ERROR_DISMISS,
	};
}

const initialState = {
	[ALGORITHMS]: [],
};
let id = 0;

const reducer = (state = fromJS(initialState), action) => {
	const { type, payload } = action;
	switch (type) {
		case ANALYZE:
			// FileList is already Immutable (though this may not hold for the future)
			return state.set(type, payload);
		case DESCRIPTION:
			// string is already immutable
			return state.set(type, payload);
		case RESET:
			return state.set(ANALYZE, null);
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
				list.update(
					list.findIndex(algorithm => algorithm.get('id') === payload.key.id),
					instance =>
						instance
							.set('dirty', payload.dirty)
							.set('parameters', payload.value)
				)
			);
		case ERROR_DISMISS:
			return state.delete(ERROR);
		case REQUEST:
			return state.set(type, true);
		case SUCCESS:
			return state
				.delete(REQUEST)
				.delete(ERROR)
				.set(type, fromJS(payload));
		case ERROR:
			return state.delete(REQUEST).set(type, fromError(payload));
		default:
			return state;
	}
};

export default reducer;

///-- SELECTORS --///
var getKeyImmutable = key => state => state.getIn(['app', 'analyze', key]);

export const getAnalyze = createIdentitySelector(getKeyImmutable(ANALYZE));
export const getDescription = createIdentitySelector(
	getKeyImmutable(DESCRIPTION)
);

export const getAlgorithmInstances = createToJSSelector(
	getKeyImmutable(ALGORITHMS)
);

export const getRequest = createIdentitySelector(getKeyImmutable(REQUEST));
export const getResult = createToJSSelector(getKeyImmutable(SUCCESS));
export const getError = createToJSSelector(getKeyImmutable(ERROR));
