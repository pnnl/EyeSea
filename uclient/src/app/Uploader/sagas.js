import { put, takeLatest, call, select } from 'redux-saga/effects';
import { send } from '../util/request';

import {
	REQUEST,
	SUCCESS,
	ERROR,
	getFiles,
	getDescription,
	getAlgorithmInstances,
} from './module';

export function* uploadVideos(action) {
	try {
		let files = yield select(getFiles);
		let description = yield select(getDescription);
		let algorithms = yield select(getAlgorithmInstances);

		let form = new FormData();
		form.append('upload', files[0]);
		form.append('description', description);
		form.append(
			'analyses',
			JSON.stringify(
				algorithms.filter(algorithm => !algorithm.disabled).map(algorithm => ({
					mid: algorithm.mid,
					parameters: algorithm.parameters,
				}))
			)
		);

		let payload = yield call(send, action.servicePath + 'video', form);

		if (payload.error) {
			yield put({
				type: ERROR,
				payload: payload,
			});
		} else {
			yield put({
				type: SUCCESS,
				payload,
			});
		}
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
