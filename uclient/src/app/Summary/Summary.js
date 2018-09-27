import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import * as d3 from 'd3';
import _ from 'lodash';
import Busy from '../Busy';
import { getServicePath, getAnalysisMethodsById } from '../module';
import { request as requestVideo, getVideo } from '../Video';
import StackedOccurrencesGraph from '../shared/StackedOccurrencesGraph';
import {
	request as requestStatistics,
	getStatistics,
	getStatisticsError,
} from './module';
import './Summary.scss';

export class Summary extends React.PureComponent {
	constructor() {
		super();
		this.state = {
			expanded: false,
		};
	}
	addCommas = (function() {
		var groups = /(\d+)(\d{3})/;

		return number => {
			number = (number + '').split('.');

			var integers = number[0],
				decimals = number.length > 1 ? '.' + number[1] : '';

			while (groups.test(integers)) {
				integers = integers.replace(groups, '$1,$2');
			}
			return integers + decimals;
		};
	})();
	simplify = (function() {
		var unit = ['', '', ''].concat('KK MM GGBTT PP EE ZZ YY'.split(''));

		return (number, money) => {
			if (number === 0) {
				return number + '';
			}

			var log10 = Math.log(number) / Math.log(10);

			if (Math.round(log10) - log10 < 0.00000001) {
				log10 = Math.round(log10);
			}

			let oom = Math.max(0, Math.floor(Math.floor(log10) / 3) * 3);
			let value = (number / Math.pow(10, oom))
				.toFixed(1)
				.replace(/\.0+$|0+$/, '');

			if (value.indexOf('.') !== -1 && value.length > 4) {
				value = Math.round(value) + '';
			}
			// The one case the above misses.
			// (1000 -> 1K so this doesn't trigger there. Only for numbers like 999900 which should be 1M, not 1000K)
			if (value === '1000') {
				value = 1;
				oom += 2;
			}

			if (money && (oom === 9 || oom === 10)) {
				oom = 11;
			}

			return value + unit[oom];
		};
	})();
	time(value) {
		var label = '',
			division = 3600;

		if (value > 86400) {
			let days = Math.floor(value / 86400);
			value -= days * 86400;
			label += _.padStart(days, 2, '0') + ':';
		}
		while (division >= 1) {
			if (value >= division) {
				let part = Math.floor(value / division);
				value -= part * division;
				label += _.padStart(part, 2, '0') + ':';
			} else {
				label += '00:';
			}
			division /= 60;
		}
		return label.substring(0, label.length - 1);
	}
	ticks(max) {
		var div = 5;

		if (max / 5 < 15) {
			if (max / 3 < 15) {
				div = max / 2 < 15 ? 0 : 2;
			} else {
				div = 3;
			}
		}

		let ticks = [
			{
				value: 0,
				label: '00:00:00',
			},
		];

		for (let i = 1; i < div; i++) {
			let value = Math.floor((i * max) / div);
			ticks.push({
				value,
				label: this.time(value),
				adjust: 21,
			});
		}

		ticks.push({
			value: max,
			label: this.time(max),
			adjust: 42,
		});
		return ticks;
	}
	onToggle = () => {
		this.setState({
			expanded: !this.state.expanded,
		});
	};
	componentDidMount() {
		if (!this.props.video) {
			this.props.requestVideo(this.props.match.params.id);
		}
		this.props.requestStatistics(this.props.match.params.id);
	}
	render() {
		var statistics = <Busy error={this.props.error} />;
		if (this.props.statistics) {
			statistics = (
				<div className="statistics">
					<h3>Total Detections</h3>
					<p>{this.addCommas(this.props.statistics.totalDetections)}</p>
					<h3>Total % Time Has Detections</h3>
					<p>
						{(this.props.statistics.percentTimeWithDetections * 100).toFixed(0)}
						%
					</p>
					<h3>Min/Avg/Max size of objects (pixels)</h3>
					<p>
						{this.simplify(this.props.statistics.minBoundingBoxArea)}/
						{this.simplify(
							Math.floor(this.props.statistics.avgBoundingBoxArea)
						)}
						/{this.simplify(this.props.statistics.maxBoundingBoxArea)}
					</p>
				</div>
			);
		}
		window.ticks = this.ticks;
		window.time = this.time;
		console.log(
			this.props.video && d3.ticks(0, this.props.video.duration, 2),
			this.props.video && this.props.video.duration
		);
		let graphs = [];
		if (this.props.video && !this.props.video.analyses.length) {
			graphs = ['This video has no analyses.'];
		} else if (this.state.expanded) {
			let bins = this.props.video.analyses.reduce((bins, analysis) => {
				var method = analysis.method;
				if (!bins[method]) {
					bins[method] = [];
				}
				bins[method].push(analysis);
				return bins;
			}, {});
			Object.keys(bins)
				.sort()
				.map(algorithm => {
					graphs.push(
						<React.Fragment>
							<h4>
								<span
									className="box"
									style={{ background: this.props.methods[algorithm].color }}
								/>
								{this.props.methods[algorithm].description +
									' (' +
									bins[algorithm].length +
									')'}
							</h4>
							<StackedOccurrencesGraph
								key={algorithm}
								values={bins[algorithm]}
								colors={this.props.methods}
							/>
						</React.Fragment>
					);
				});
		} else if (this.props.video) {
			graphs.push(
				<StackedOccurrencesGraph
					key="summary-graph"
					values={this.props.video.analyses}
				/>
			);
		}
		let duration = (3 * 60 + 15) * 60 + 1;
		let x = d3
			.scaleLinear()
			.range([0, 548])
			.domain([
				0,
				duration || (this.props.video && this.props.video.duration) || 1,
			]);
		return (
			<div className="video-summary">
				<Link to={'/video/' + this.props.match.params.id}>
					<i className="icon fa fa-chevron-left" />
					Video View
				</Link>
				<div>
					<div className={this.state.expanded ? 'expanded' : ''}>
						<img
							src={
								this.props.servicePath +
								'video/' +
								this.props.match.params.id +
								'/heatmap'
							}
						/>
						<h3 className="expando" onClick={this.onToggle}>
							{this.state.expanded ? '▼' : '▶'} Expand to see detections per
							algorithm
						</h3>
						{graphs}
						<svg className="time-graph" viewBox="0 0 573 28">
							{this.ticks(
								duration || (this.props.video && this.props.video.duration) || 1
							).map(tick => (
								<React.Fragment key={tick.value}>
									<line x1={x(tick.value)} y1={0} x2={x(tick.value)} y2={12} />
									<text x={x(tick.value) - tick.adjust} y={23}>
										{tick.label}
									</text>
								</React.Fragment>
							))}
						</svg>
					</div>
					{statistics}
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => ({
	servicePath: getServicePath(state),
	video: getVideo(state),
	statistics: getStatistics(state),
	error: getStatisticsError(state),
	methods: getAnalysisMethodsById(state),
});

export default connect(
	mapStateToProps,
	{
		requestVideo,
		requestStatistics,
	}
)(Summary);
