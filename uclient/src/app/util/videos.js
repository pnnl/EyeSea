export const formatDuration = function(video) {
	var analysis =
		video.analyses &&
		video.analyses.find(analysis => analysis.status === 'FINISHED');

	if (video.duration || analysis) {
		let length = video.duration ||
			analysis.results[analysis.results.length - 1].frameIndex / video.fps;
		let hours = Math.floor(length / 3600);
		let minutes = Math.floor((length - hours * 3600) / 60);
		let seconds = Math.round(length - hours * 3600 - minutes * 60);

		if (hours < 10) {
			hours = '0' + hours;
		}
		if (minutes < 10) {
			minutes = '0' + minutes;
		}
		if (seconds < 10) {
			seconds = '0' + seconds;
		}

		return hours + ':' + minutes + ':' + seconds;
	}
	return '??:??:??';
};
