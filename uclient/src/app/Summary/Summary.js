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
					<p>{this.props.statistics.totalDetections}</p>
					<h3>Total % Time Has Detections</h3>
					<p>
						{(this.props.statistics.percentTimeWithDetections * 100).toFixed(0)}%
					</p>
					<h3>Min/Avg/Max size of objects (pixels)</h3>
					<p>
						{this.props.statistics.minBoundingBoxArea}/{Math.floor(
							this.props.statistics.avgBoundingBoxArea
						)}/{this.props.statistics.maxBoundingBoxArea}
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

export default connect(
	mapStateToProps,
	{
		requestVideo,
		requestStatistics,
	}
)(Summary);
