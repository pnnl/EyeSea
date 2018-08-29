import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import Busy from '../Busy';
import { getServicePath } from '../module';
import { request as requestVideo, getVideo } from '../Video';
import {
	request as requestStatistics,
	getStatistics,
	getStatisticsError,
} from './module';
import './Summary.scss';

export class Summary extends React.PureComponent {
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

			var value,
				oom,
				log10 = Math.log(number) / Math.log(10);

			if (Math.round(log10) - log10 < 0.00000001) {
				log10 = Math.round(log10);
			}

			oom = Math.max(0, Math.floor(Math.floor(log10) / 3) * 3);

			value = (number / Math.pow(10, oom)).toFixed(1).replace(/\.0+$|0+$/, '');

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
						{(this.props.statistics.percentTimeWithDetections * 100).toFixed(0)}%
					</p>
					<h3>Min/Avg/Max size of objects (pixels)</h3>
					<p>
						{this.simplify(this.props.statistics.minBoundingBoxArea)}/{this.simplify(
							Math.floor(this.props.statistics.avgBoundingBoxArea)
						)}/{this.simplify(this.props.statistics.maxBoundingBoxArea)}
					</p>
				</div>
			);
		}
		return (
			<div className="video-summary">
				<Link to={'/video/' + this.props.match.params.id}>
					<i className="icon fa fa-chevron-left" />
					Video View
				</Link>
				<div>
					<div>
						<img
							src={
								this.props.servicePath +
								'video/' +
								this.props.match.params.id +
								'/heatmap'
							}
						/>
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
});

export default connect(mapStateToProps, {
	requestVideo,
	requestStatistics,
})(Summary);
