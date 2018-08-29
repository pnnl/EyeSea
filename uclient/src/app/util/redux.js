import { fromJS } from 'immutable';
import { createSelector } from 'reselect';

export function fromError(error) {
	return fromJS({
		message: error.message || error,
		original: error,
	});
}

export function createToJSSelector(input) {
	return createSelector(input, value => value && value.toJS());
}

export function createIdentitySelector(input) {
	return createSelector(input, value => value);
}
