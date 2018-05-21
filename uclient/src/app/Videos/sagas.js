import { put, takeLatest, call, select } from 'redux-saga/effects';
import { get } from '../util/request';

import { REQUEST, SUCCESS, ERROR, getSort } from './module';

export function* requestVideos(action) {
	try {
		let sort = yield select(getSort);

		let payload = yield call(get, action.servicePath + 'video', {
			sortBy: [sort],
		});

		let count = 280;
		payload.forEach((video, index) => {
			if (index % 2) {
				video.preview =
					'https://placekitten.com/g/' +
					count +
					'/' +
					Math.floor(count * 0.57142857142857142857142857142857);
			} else {
				video.preview =
					'https://placekitten.com/' +
					count +
					'/' +
					Math.floor(count * 0.57142857142857142857142857142857);
			}
			count += 25;
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
	yield [takeLatest(REQUEST, requestVideos)];
}
