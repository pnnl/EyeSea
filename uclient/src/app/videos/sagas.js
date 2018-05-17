import { put, takeLatest, call } from 'redux-saga/effects';

import { REQUEST, SUCCESS, ERROR } from './module';

export function* requestVideos(action) {
	try {
		var payload = [
			{
				name: 'orpc_adults_then_smolt',
				preview: 'https://placekitten.com/280/160',
				duration: 37,
			},
			{
				name: 'north_richland_columbia_river',
				preview: 'https://placekitten.com/g/280/160',
				duration: 7237,
			},
			{
				name: 'orpc_adults_then_smolt1',
				preview: 'https://placekitten.com/280/161',
				duration: 37,
			},
			{
				name: 'north_richland_columbia_river2',
				preview: 'https://placekitten.com/g/280/162',
				duration: 7237,
			},
			{
				name: 'orpc_adults_then_smolt3',
				preview: 'https://placekitten.com/280/163',
				duration: 37,
			},
			{
				name: 'north_richland_columbia_river4',
				preview: 'https://placekitten.com/g/280/164',
				duration: 7237,
			},
			{
				name: 'orpc_adults_then_smolt5',
				preview: 'https://placekitten.com/280/165',
				duration: 37,
			},
			{
				name: 'north_richland_columbia_river6',
				preview: 'https://placekitten.com/g/280/166',
				duration: 7237,
			},
		];

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
