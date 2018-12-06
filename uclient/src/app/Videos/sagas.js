import { put, takeLatest, call, select } from 'redux-saga/effects';
import { get, toQueryString } from '../util/request';

import { REQUEST, SUCCESS, ERROR, getSort, SORT } from './module';

import { FINISHED as UPLOAD_FINISHED } from '../Uploader';

export function* requestVideos(action) {
	try {
		let sort = yield select(getSort);

		let payload = yield call(
			get,
			action.servicePath +
				'video?' +
				toQueryString({
					sortBy: JSON.stringify([
						{
							prop: sort.property,
							asc: sort.ascending,
						},
						// break ties
						{
							prop: 'vid',
							asc: true,
						},
					]),
				})
		);

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
	yield [takeLatest([REQUEST, UPLOAD_FINISHED, SORT], requestVideos)];
}
