import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import _ from 'lodash';
import { formatDuration } from '../util/videos';
import Busy from '../Busy';
import { getAnalysisMethods, getAnalysisMethodsError } from '../module';
import { request, getVideo, getVideoError } from './module';
import './Video.scss';

export class Video extends React.PureComponent {
	constructor() {
		super();
	}
	componentDidMount() {
		this.props.requestVideo(this.props.match.params.id);
	}
	render() {
		var video = <Busy error={this.props.error} />;

		if (this.props.video && !this.props.error) {
			console.log(this.props.video);
			video = (
				<section>
					<header>
						<h2>{this.props.video.filename}</h2>
						<div className="info">
							<span className="icon-label">Info</span>
							<i className="icon fa fa-info" />

							<div className="popup">
								<div>
									<strong>Name:</strong> {this.props.video.filename}
								</div>
								<div>
									<strong>Description:</strong> {this.props.video.description}
								</div>
								<div>
									<strong>FPS:</strong> {this.props.video.fps}
								</div>
								<div>
									<strong>Duration:</strong> {formatDuration(this.props.video)}
								</div>
							</div>
						</div>
					</header>
					<div className="viewer">
						<video src={this.props.video.uri} />
					</div>
					<div className="annotations">
						<h3>Detections and Annotations</h3>
					</div>
					<div className="controls" />
				</section>
			);
		}
		return (
			<div className="video-detail">
				<Link to="/">
					<i className="icon fa fa-chevron-left" />
					Thumbnail View
				</Link>
				{video}
			</div>
		);
	}
}
const mapStateToProps = state => ({
	video: getVideo(state),
	methods: getAnalysisMethods(state),
	error: getVideoError(state) || getAnalysisMethodsError(state),
});

export default connect(
	mapStateToProps,
	{
		requestVideo: request,
	}
)(Video);
