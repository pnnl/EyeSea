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
			[0, '#3060cf'],
			[0.2, '#fffbbc'],
			[0.6, '#c4463a'],
			[0.8, '#c4463a'],
			[1.0, '#ffffff'],
		],
		min: 0,
		max: 1000,
		startOnTick: false,
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
