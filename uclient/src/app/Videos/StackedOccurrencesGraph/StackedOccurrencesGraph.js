import React from 'react';
import * as d3 from 'd3';
import './StackedOccurrencesGraph.scss';

export class StackedOccurrencesGraph extends React.PureComponent {
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

			let slots = [
				'#4a90e2',
				'#9013fe',
				'#11b579',
				'#005a84',
				'#92a526',
				'#e3c51f',
				'#e42b31',
			];

			let frames = [],
				detections;

			this.props.values.forEach((frame, index) => {
				if (!index) {
					if (detections) {
						frames.push.apply(
							frames,
							detections.map(detection => (
								<rect
									key={
										detection.x1 +
										',' +
										detection.y1 +
										',' +
										detection.x2 +
										',' +
										detection.y2
									}
									x={x(detection.frameIndex)}
									y={y(detection.slot + 1)}
									width={x(frame.frameIndex) - x(detection.frameIndex)}
									height={y(detection.slot) - y(detection.slot + 1)}
									fill={detection.color}
								/>
							))
						);
					}
					detections = frame.detections.map((detection, index) => {
						var color = slots.shift();
						slots.push(color);
						return Object.assign(
							{
								frameIndex: frame.frameIndex,
								slot: index,
								color,
							},
							detection
						);
					});
				} else {
					let found = {},
						newDetections = [];

					frame.detections.forEach((detection, index) => {
						var index = detections.findIndex(
							existing =>
								existing &&
								(Math.abs(existing.x1 - detection.x1) < 11) +
									(Math.abs(existing.x2 - detection.x2) < 11) +
									(Math.abs(existing.y1 - detection.y1) < 11) +
									(Math.abs(existing.y2 - detection.y2) < 11) >
									2
						);

						// New fish?
						if (index === -1 || found[index]) {
							let color = slots.shift();
							slots.push(color);
							newDetections.push(
								Object.assign(
									{
										frameIndex: frame.frameIndex,
										color,
									},
									detection
								)
							);
						} else {
							found[index] = true;
						}
					});

					detections.forEach((detection, index) => {
						if (!found[index]) {
							frames.push(
								<rect
									key={
										detection.x1 +
										',' +
										detection.y1 +
										',' +
										detection.x2 +
										',' +
										detection.y2
									}
									x={x(detection.frameIndex)}
									y={y(detection.slot + 1)}
									width={x(frame.frameIndex) - x(detection.frameIndex)}
									height={y(detection.slot) - y(detection.slot + 1)}
									fill={detection.color}
								/>
							);
							delete detections[index];
						}
					});

					newDetections.forEach(detection => {
						let slot = 0;
						for (slot = 0; slot < detections.length + 1; slot++) {
							if (!detections[slot]) {
								detection.slot = slot;
								detections[slot] = detection;
								break;
							}
						}
					});
				}
			});
			frames.push.apply(
				frames,
				detections.map(detection => (
					<rect
						key={
							detection.slot +
							'|' +
							detection.x1 +
							',' +
							detection.y1 +
							',' +
							detection.x2 +
							',' +
							detection.y2
						}
						x={x(detection.frameIndex)}
						y={y(detection.slot + 1)}
						width={
							x(
								this.props.values[this.props.values.length - 1].frameIndex + 1
							) - x(detection.frameIndex)
						}
						height={y(detection.slot)}
						fill={detection.color}
					/>
				))
			);

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
