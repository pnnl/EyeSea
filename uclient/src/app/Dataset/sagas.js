import { put, takeLatest, call, select } from 'redux-saga/effects';
import { get } from '../util/request';

import {
	REQUEST,
	SUCCESS,
	ERROR,
    getSelected,
    DATASET
} from './module';

// worker function
export function* requestDatasets(action) {
	try {
		console.log(`in saga requestDatasets`)
		let payload = yield call(
			get,
			action.servicePath + 'datasets'
		);
		console.log(payload)
		yield put({
			type: SUCCESS,
			payload,
		});
	} catch (error) {
		console.log('requestDatasets', error);
		yield put({
			type: ERROR,
			payload: error,
		});
	}
}

// watcher function
export default function*() {
	yield [takeLatest(REQUEST, requestDatasets)];
}
