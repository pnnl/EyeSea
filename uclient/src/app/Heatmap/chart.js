export const options = {
	data: {},
	chart: {
		type: 'heatmap',
	},
	boost: {
		useGPUTranslations: true,
	},
	title: {
		text: null,
	},
	subtitle: {
		text: null,
	},
	xAxis: {
		title: {
			text: null,
		},
	},
	yAxis: {
		title: {
			text: null,
		},
	},
	colorAxis: {
		stops: [[0, '#3060cf'], [0.5, '#fffbbc'], [0.9, '#c4463a'], [1, '#c4463a']],
		min: 0,
		max: 1000,
		startOnTick: false,
		endOnTick: false,
		labels: {
			format: '{value}',
		},
	},
	series: [
		{
			boostThreshold: 100,
			borderWidth: 0,
			nullColor: '#EFEFEF',
			tooltip: {
				headerFormat: 'Number Detected<br/>',
				pointFormat: '[{point.x},{point.y}] <b>{point.value}</b>',
			},
			turboThreshold: Number.MAX_VALUE,
		},
	],
};
