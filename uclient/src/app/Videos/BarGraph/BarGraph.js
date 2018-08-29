import React from 'react';
import * as d3 from 'd3';
import './BarGraph.scss';

export class BarGraph extends React.PureComponent {
	ticks(max) {
		var wanted = max > 2 ? max : 3;
		var ticks = d3.ticks(0, max, wanted);

		// d3 treats the tick count as a guideline, and frequently the last tick
		// is lower than the max necessitating another tick. This causes it to
		// recompute them so the last tick will always be encompassing of the
		// max value, even if we have to add another tick to get the total
		// number of ticks we asked for.
		// if (ticks[ticks.length - 1] < max + 1) {
		// ticks = d3.ticks(0, max + 1, wanted);
		// }

		// The above can cause it to generate one less tick than we want. This
		// just handles all cases if for some reason we get back way less than
		// we asked for.
		// while (ticks.length < wanted) {
		// ticks.push(ticks[ticks.length - 1] + ticks[1] - ticks[0]);
		// }
		return ticks;
	}
	componentDidMount() {
		this.forceUpdate(); // first time update after refs
	}
	render() {
		if (this.props.values) {
			let box = this.svg && this.svg.getBoundingClientRect();
			let maxX = ((box && box.width) || 100) - 16;
			let maxY = (box && box.height) || 100;

			let max = this.props.values.reduce(
				(max, frame) => Math.max(max, frame.detections.length),
				0
			);

			let ticks = this.ticks(max);
			let y = d3
				.scaleLinear()
				.domain([0, max + 1])
				.range([maxY - 4, 4]);
			max = ticks[ticks.length - 1];

			let x = d3
				.scaleLinear()
				.domain([
					0,
					this.props.values[this.props.values.length - 1].frameIndex + 1,
				])
				.range([0, maxX]);

			let labels = ticks
				.map(tick => (
					<text key={tick} x={maxX + 2} y={y(tick)}>
						{tick}
					</text>
				))
				.filter((tick, index) => !(index % 2));

			ticks = ticks.map(tick => (
				<line key={y(tick)} x1="0" y1={y(tick)} x2={maxX} y2={y(tick)} />
			));

			let path = ['M', x(0), ',', y(0)],
				detections = 0;

			this.props.values.forEach((frame, index) => {
				let count = frame.detections.length;

				if (index) {
					path.push(' H', x(frame.frameIndex));
				}

				if (count !== detections) {
					path.push(' V', y(count));
					detections = count;
				}
			});

			if (detections !== 0) {
				path.push(' V', y(0));
			}

			return (
				<svg
					className="stacked-occurrences-graph"
					ref={ref => (this.svg = ref)}
				>
					<defs>
						<linearGradient
							id="water"
							x1="0%"
							y1="0%"
							x2="0%"
							y2="100%"
							gradientUnits="userSpaceOnUse"
						>
							<stop offset="5%" stopColor="#4a90e2" />
							<stop offset="95%" stopColor="#005a84" />
						</linearGradient>
					</defs>
					{ticks}
					{labels}
					{<path d={path.join('') + ' Z'} fill="url(#water)" />}
				</svg>
			);
		} else {
			return <div>Loading...</div>;
		}
	}
}
export default BarGraph;
