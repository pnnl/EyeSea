import { eventChannel, END, delay } from 'redux-saga';
import { put, take, takeLatest, call, select } from 'redux-saga/effects';
import { get, send } from '../util/request';

import {
	REQUEST,
	SUCCESS,
	ERROR,
	ANN,
	ANNERROR,
	ANNSUCCESS,
	getAnns,
} from './module';

export function* requestVideo(action) {
	try {
		let payload = yield call(
			get,
			action.servicePath + 'video/' + action.payload
		);

		yield put({
			type: SUCCESS,
			payload,
		});
	} catch (error) {
		console.log('requestVideo', error);
		yield put({
			type: ERROR,
			payload: error,
		});
	}
}

export function* uploadAnns(action) {
	try {
		let ann = action.payload; //yield select();
		let form = new FormData();
		form.append('data', JSON.stringify(ann));
		var request = eventChannel(function(emit) {
			var request = new XMLHttpRequest();
			request.onreadystatechange = function() {
				if (request.readyState === 4) {
					try {
						if (request.status === 200) {
							emit({ result: JSON.parse(request.responseText) });
							emit(END);
						} else {
							emit({ error: JSON.parse(request.responseText) });
							emit(END);
						}
					} catch (error) {
						// It's not JSON or invalid JSON, but probably safe to assume it's
						// a generic error from the server such as in the case of a 500 code.
						emit({ error: request.responseText });
						emit(END);
					}
				}
			};
			request.open('POST', action.servicePath + 'annotations');
			request.send(form);

			return function() {
				request.abort();
			};
		});

		let event = yield take(request);
		while (event !== END) {
			if (event.error || (event.result && event.result.error)) {
				yield put({
					type: ANNERROR,
					payload: event.error,
				});
			} else {
				console.log(event.result);
				yield put({
					type: ANNSUCCESS,
					payload: event.result || event,
				});
			}
			event = yield take(request);
		}
	} catch (error) {
		console.log('uploadAnns', error);
		yield put({
			type: ERROR,
			payload: error,
		});
	}
}

export default function*() {
	yield [takeLatest(REQUEST, requestVideo), takeLatest(ANN, uploadAnns)];
}
