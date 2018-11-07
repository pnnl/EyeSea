import { put, takeLatest, call, select } from 'redux-saga/effects';
import { get } from '../util/request';

import { REQUEST, SUCCESS, ERROR, getSort } from './module';

import { FINISHED as UPLOAD_FINISHED } from '../Uploader';

export function* requestVideos(action) {
	try {
		let sort = yield select(getSort);

		let payload = yield call(get, action.servicePath + 'video', {
			sortBy: [sort],
		});

		yield put({
			type: SUCCESS,
			payload,
		});
	} catch (error) {
		console.log('requestVideos', error);
		yield put({
			type: ERROR,
			payload: error,
		});
	}
}

export default function*() {
	yield [takeLatest([REQUEST, UPLOAD_FINISHED], requestVideos)];
}
