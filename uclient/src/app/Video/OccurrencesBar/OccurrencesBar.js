import React from 'react';
import './OccurrencesBar.scss';

export default class OccurrencesBar extends React.PureComponent {
	render() {
		var id = this.props.analysis.id,
			results = this.props.analysis.results,
			detections;

		if (results.length) {
			let length =
					(results.length && results[results.length - 1].frameIndex) || 0,
				start = -1,
				end;
			detections = [];

			results.forEach((frame, index) => {
				if (frame.detections.length && start === -1) {
					start = frame.frameIndex;
					end = frame.frameIndex + 1;
				} else if (frame.detections.length && frame.frameIndex === end) {
					end = frame.frameIndex + 1;
				}
				if (
					start !== -1 &&
					(!frame.detections.length ||
						index === this.props.analysis.results.length - 1)
				) {
					detections.push(
						<div
							key={this.props.analysis.id + ',' + frame.frameIndex}
							style={{
								background: this.props.color,
								left: (start / length) * 100 + '%',
								width: ((end - start) / length) * 100 + '%',
							}}
						/>
					);
					start = -1;
				}
			});
		}

		return (
			<div
				className={'occurrences-bar ' + this.props.analysis.status}
				style={{
					animationDelay: id * -0.5,
					animationDuration: (id % 3) * 0.1 + 0.5 + 's',
					'--color': this.props.color,
				}}
			>
				{detections}
			</div>
		);
	}
}
