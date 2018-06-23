import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import _ from 'lodash';
import { formatDuration } from '../util/videos';
import Busy from '../Busy';
import {
	getServicePath,
	getAnalysisMethods,
	getAnalysisMethodsById,
	getAnalysisMethodsError,
} from '../module';
import { request, getVideo, getVideoError } from './module';
import './Video.scss';

export class Video extends React.Component {
	constructor() {
		super();
		this.state = {
			paused: true,
			detections: [],
		};
	}
	// If we don't capature the mouse, then if the take the mouse out of the
	// element and release it, we won't get notified and they'll be stuck
	captureMouse(event) {
		// IE10; Do we care?
		if (event.target.msSetPointerCapture) {
			event.target.msSetPointerCapture(event.pointerId);
		} else if (event.target.setPointerCapture) {
			event.target.setPointerCapture(event.pointerId);
		}
	}
	releaseMouse(event) {
		if (event.target.msReleasePointerCapture) {
			event.target.msReleasePointerCapture(event.pointerId);
		} else if (event.target.releasePointerCapture) {
			event.target.releasePointerCapture(event.pointerId);
		}
	}
	rewindFrame = timestamp => {
		let progress = timestamp - this.timestamp;
		// Unfortunately Firefox shows a loading overlay if we do this too many
		// times in a row and it doesn't go away until we stop.
		this.player.currentTime -=
			((this.player.defaultPlaybackRate * 4) / 1000) * progress;
		this.timestamp = timestamp;
		if (!this.stopRewinding) {
			requestAnimationFrame(this.rewindFrame);
		}
	};
	rewind(event, start) {
		if (start) {
			this.captureMouse(event);
			// Firefox throws an error when we do this, so we can't do the same
			// simple thing we do with fast forward. Bummer. :(
			//this.player.playbackRate = -4;
			this.player.pause();
			this.timestamp = performance.now();
			delete this.stopRewinding;
			this.rewindFrame(this.timestamp);
		} else {
			this.stopRewinding = true;
			this.releaseMouse(event);
			this.player.playbackRate = this.player.defaultPlaybackRate;
		}
	}
	fastForward(event, start) {
		if (start) {
			this.captureMouse(event);
			this.player.playbackRate = this.player.defaultPlaybackRate * 4;
			this.player.play();
		} else {
			this.releaseMouse(event);
			this.player.playbackRate = this.player.defaultPlaybackRate;
		}
	}
	timeUpdate = () => {
		var detections = [],
			frame = Math.floor(this.player.currentTime * this.props.video.fps);

		if (this.props.video.analyses) {
			this.props.video.analyses.forEach(analysis => {
				if (analysis.status === 'FINISHED') {
					detections.push({
						name: this.props.methods.ids[analysis.method].description,
						color: this.props.methods.ids[analysis.method].color,
						results: analysis.results[frame] || {
							detections: [],
						},
					});
				}
			});

			this.setState({
				detections,
			});
		}
	};
	componentDidMount() {
		this.props.requestVideo(this.props.match.params.id);
	}
	render() {
		var video = <Busy error={this.props.error} />;

		if (this.props.video && !this.props.error) {
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
						<video
							ref={player => (this.player = player)}
							src={
								this.props.servicePath +
								'video/' +
								this.props.video.id +
								'/file'
							}
							onPlay={() => this.setState({ paused: false })}
							onPause={() => this.setState({ paused: true })}
							onTimeUpdate={this.timeUpdate}
							crossOrigin="anonymous"
							playsInline
						>
							Sorry, this browser does not support video playback.
						</video>
					</div>
					<div className="annotations">
						<h3>Detections and Annotations</h3>
						<ul>
							{this.state.detections.map(method => (
								<li key={method.name} className="method">
									<span className="box" style={{ background: method.color }} />
									<h4>{method.name}</h4>
									<ul>
										{method.results.detections.map((detection, index) => (
											<li key={method.name + '-' + index}>Fish {index + 1}</li>
										))}
									</ul>
								</li>
							))}
						</ul>
					</div>
					<div className="controls">
						<span
							className="rewind button"
							onMouseDown={event => this.rewind(event, true)}
							onMouseUp={event => this.rewind(event, false)}
						>
							<span className="icon-label">Rewind</span>
							<i className="fa fa-backward" />
						</span>
						<span className="previous-frame button">
							<span className="icon-label">Next Frame</span>
							<i className="fa fa-square-o" />
							<i className="fa fa-arrow-left" />
						</span>
						{this.state.paused ? (
							<span className="play button" onClick={() => this.player.play()}>
								<span className="icon-label">Play</span>
								<i className="fa fa-play" />
							</span>
						) : (
							<span
								className="pause button"
								onClick={() => this.player.pause()}
							>
								<span className="icon-label">Pause</span>
								<i className="fa fa-pause" />
							</span>
						)}
						<span className="next-frame button">
							<span className="icon-label">Next Frame</span>
							<i className="fa fa-square-o" />
							<i className="fa fa-arrow-right" />
						</span>
						<span
							className="fast-forward button"
							onMouseDown={event => this.fastForward(event, true)}
							onMouseUp={event => this.fastForward(event, false)}
						>
							<span className="icon-label">Fast forward</span>
							<i className="fa fa-forward" />
						</span>
					</div>
					<div className="options">
						<span className="annotate">
							<i className="fa fa-pencil-square-o" />
							<span className="label">Annotation</span>
						</span>
						<span className="download disabled">
							<i className="fa fa-download" />
							<span className="label">Download</span>
						</span>
					</div>
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
	servicePath: getServicePath(state),
	video: getVideo(state),
	methods: {
		list: getAnalysisMethods(state),
		ids: getAnalysisMethodsById(state),
	},
	error: getVideoError(state) || getAnalysisMethodsError(state),
});

export default connect(
	mapStateToProps,
	{
		requestVideo: request,
	}
)(Video);
