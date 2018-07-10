import { put, takeLatest, call, select } from 'redux-saga/effects';
import { get } from '../util/request';

import { REQUEST, SUCCESS, ERROR } from './module';

export function* requestStatistics(action) {
	try {
		let payload = yield call(get, action.servicePath + 'video/' + action.payload + '/statistics');

		yield put({
			type: SUCCESS,
			payload,
		});
	} catch (error) {
		console.log('requestStatistics', error);
		yield put({
			type: ERROR,
			payload: error,
		});
	}
}

export default function*() {
	yield [takeLatest(REQUEST, requestStatistics)];
}
