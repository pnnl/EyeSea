import React from 'react';
import * as d3 from 'd3';
import './StackedOccurrencesGraph.scss';

export class StackedOccurrencesGraph extends React.PureComponent {
    constructor() {
        super();
        this.colors = [
            '#32e0fb',
            '#de2cf7',
            '#2fff97',
            '#606efd',
            '#fe4040',
            '#bbfd23',
        ];
    }
	ticks(max) {
		if (max <= 2) {
			return d3.ticks(0, max, 3);
		} else if (max % 3 === 0) {
			return d3.ticks(0, max, 3);
		} else if (max % 5 === 0) {
			return d3.ticks(0, max, 5);
		}
		return d3.ticks(0, max, 7);
	}
	componentDidMount() {
		this.forceUpdate(); // first time update after refs
	}
	render() {
		if (this.props.values) {
			let box = this.svg && this.svg.getBoundingClientRect();
			let maxX = ((box && box.width) || 100) - 16;
			let maxY = (box && box.height) || 100;

			let length = this.props.values.reduce(
				(max, set) => Math.max(max, set.results.length),
				0
			);

			let frame,
				maxDetections = 0;

			for (frame = 0; frame < length; frame++) {
				maxDetections = Math.max(
					this.props.values.reduce(
						(max, set) =>
							max +
							((set.results[frame] && set.results[frame].detections.length) ||
								0),
						0
					),
					maxDetections
				);
			}

			let maxFrames = this.props.values.reduce(
				(max, set) =>
					Math.max(
						max,
						(set.results &&
							set.results.length &&
							set.results[set.results.length - 1].frameIndex + 1) ||
							0
					),
				0
			);

			let ticks = this.ticks(maxDetections);
			let y = d3
				.scaleLinear()
				.domain([0, maxDetections + 1])
				.range([maxY - 4, 4]);

			let x = d3
				.scaleLinear()
				.domain([0, maxFrames])
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

			let frames = {},
				slot,
				colored = {},
				color = 0;

			this.props.values.forEach(set => {
				if (set.results.length) {
					frames[set.id] = 'M' + x(0) + ',' + y(0);
				}
			});

			for (frame = 0; frame < length; frame++) {
				slot = 0;
				this.props.values.forEach(set => {
					if (set.results[frame]) {
						let index = set.results[frame].frameIndex;
						let count = set.results[frame].detections.length;
						slot += count;

						frames[set.id] +=
							' L' +
							x(index) +
							',' +
							y(slot) +
							' L' +
							x(index + 1) +
							',' +
							y(slot);

						if (frame === length - 1) {
							frames[set.id] += ' L' + x(index + 1) + ',' + y(0) + ' Z';
						}
					}
				});

				this.props.values.forEach(set => {
					if (frame < length - 1 && !slot && set.results[frame]) {
						frames[set.id] +=
							' L' + x(set.results[frame].frameIndex + 1) + ',' + y(0);
					}
				});
			}

			frames = Object.keys(frames)
				.reverse()
				.map(id => <path key={id} d={frames[id]} fill={this.colors[color++]} />);

			return (
				<svg
					className="stacked-occurrences-graph"
					ref={ref => (this.svg = ref)}
				>
					{ticks}
					{labels}
					{frames}
				</svg>
			);
		} else {
			return <div>Loading...</div>;
		}
	}
}
export default StackedOccurrencesGraph;
