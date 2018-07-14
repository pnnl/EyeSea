import { put, takeLatest, call, select } from 'redux-saga/effects';
import { get } from '../util/request';

import { REQUEST, SUCCESS, ERROR } from './module';

export function* uploadVideos(action) {
	try {
		let payload = yield call(post, action.servicePath + 'video');

		yield put({
			type: SUCCESS,
			payload,
		});
	} catch (error) {
		console.log('uploadVideos', error);
		yield put({
			type: ERROR,
			payload: error,
		});
	}
}

export default function*() {
	yield [takeLatest(REQUEST, uploadVideos)];
}
