import { put, takeLatest, call } from 'redux-saga/effects';
import { sagas as videos } from '../app/videos';

export default function*() {
	yield [call(videos)];
}
