export const options = {
	data: {},
	chart: {
		type: 'heatmap',
		width: 600,
		height: '60%',
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
		visible: false,
	},
	yAxis: {
		title: {
			text: null,
		},
		visible: false,
	},
	colorAxis: {
		stops: [
			[0.0, '#0000ff'],
			[0.1, '#00ffff'],
			[0.2, '#00ff00'],
			[0.4, '#ffff00'],
			[0.6, '#ffa500'],
			[0.8, '#ff0000'],
			[1.0, '#ffffff'],
		],
		min: 0,
		max: 1000,
		startOnTick: true,
		endOnTick: false,
		labels: {
			format: '{value}',
		},
	},
	series: [],
	// series: [
	// 	{
	// 		boostThreshold: 100,
	// 		borderWidth: 0,
	// 		nullColor: '#EFEFEF',
	// 		tooltip: {
	// 			headerFormat: 'Number Detected<br/>',
	// 			pointFormat: '[{point.x},{point.y}] <b>{point.value}</b>',
	// 		},
	// 		turboThreshold: Number.MAX_VALUE,
	// 	},
	// ],
};
