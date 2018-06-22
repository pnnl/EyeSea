import { put, takeLatest, call, select } from 'redux-saga/effects';
import { sagas as videos } from '../app/Videos';
import { sagas as video } from '../app/Video';

import { get } from '../app/util/request';

import {
	SERVICE_PATH,
	METHODS_SUCCESS,
	METHODS_ERROR,
	getServicePath,
} from '../app/module';

export function* requestAnalysisMethods() {
	try {
		let servicePath = yield select(getServicePath);
		let payload = yield call(get, servicePath + 'analysis/method');

		yield put({
			type: METHODS_SUCCESS,
			payload,
		});
	} catch (error) {
		console.log('requestAnalysisMethods', error);
		yield put({
			type: METHODS_ERROR,
			payload: error,
		});
	}
}

export default function*() {
	yield [
		takeLatest(SERVICE_PATH, requestAnalysisMethods),
		call(videos),
		call(video),
	];
}
