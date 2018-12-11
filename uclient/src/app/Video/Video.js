import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import _ from 'lodash';
import { formatDuration } from '../util/videos';
import { Button } from '../shared';
import Busy from '../Busy';
import OccurrencesBar from './OccurrencesBar';
import Analyze from '../Analyze';
import {
	getServicePath,
	getAnalysisMethods,
	getAnalysisMethodsById,
	getAnalysisMethodsError,
} from '../module';
import { request, getVideo, getVideoError, ann, getAnns } from './module';
import './Video.scss';

export class Video extends React.Component {
	constructor() {
		super();
		this.state = {
			paused: true,
			detections: [],
			mode: 0, //0 playback, 1 add, 2 select
			method: null,
			selection: [],
			drawing: {
				enabled: false,
				startX: 0,
				startY: 0,
				endX: 0,
				endY: 0,
			},
		};
		this.updateLayout = _.debounce(this.updateLayout, 200);
	}
	// If we don't capature the mouse, then if the take the mouse out of the
	// element and release it, we won't get notified and they'll be stuck
	captureMouse(event, target) {
		if (!target) {
			target = event.target;
		}
		// IE10; Do we care?
		if (target.msSetPointerCapture) {
			target.msSetPointerCapture(event.pointerId);
		} else if (target.setPointerCapture) {
			target.setPointerCapture(event.pointerId);
		}
	}
	releaseMouse(event, target) {
		if (!target) {
			target = event.target;
		}
		if (target.msReleasePointerCapture) {
			target.msReleasePointerCapture(event.pointerId);
		} else if (target.releasePointerCapture) {
			target.releasePointerCapture(event.pointerId);
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
			this.continuePlayback = !this.player.paused;
			this.captureMouse(event);
			this.player.playbackRate = this.player.defaultPlaybackRate * 4;
			this.player.play();
		} else {
			this.releaseMouse(event);
			this.player.playbackRate = this.player.defaultPlaybackRate;
			if (!this.continuePlayback) {
				this.player.pause();
			}
		}
	}
	timeUpdate = () => {
		var scrubber =
			(this.player.currentTime / this.player.duration) *
			this.canvas.clientWidth;
		this.setState({ scrubber });
	};
	playFrame = () => {
		this.setState({ paused: false }, this.computeFrame);
	};
	computeFrame = (time, single) => {
		this.drawAnalyses(this.state.detections);
		if (!single) {
			var detections = [],
				frame = Math.floor(this.player.currentTime * this.props.video.fps);
			if (this.props.video.analyses) {
				this.props.video.analyses.forEach(analysis => {
					if (analysis.status === 'FINISHED') {
						detections.push({
							id: analysis.id,
							name: this.props.methods.ids[analysis.method].description,
							color: this.props.methods.ids[analysis.method].color,
							results: analysis.results[frame] || {
								detections: [],
							},
						});
					}
				});
			}
			this.setState({ detections });

			if (!this.state.paused) {
				requestAnimationFrame(this.computeFrame);
			}
		}
	};
	scrubStart = event => {
		event.preventDefault();

		var target = event.target;
		while (!target.classList.contains('analyses')) {
			target = target.parentNode;
		}
		this.captureMouse(event, target);

		this.boundingBox = target.getBoundingClientRect();
		this.player.currentTime =
			(this.player.duration * (event.clientX - this.boundingBox.left)) /
			this.boundingBox.width;
	};
	scrubChange = event => {
		if (this.boundingBox) {
			this.player.currentTime =
				(this.player.duration * (event.clientX - this.boundingBox.left)) /
				this.boundingBox.width;
		}
	};
	scrubEnd = event => {
		var target = event.target;
		while (!target.classList.contains('analyses')) {
			target = target.parentNode;
		}
		this.releaseMouse(event, target);
		delete this.boundingBox;
	};
	downloadAnnotations() {
		window.location.href =
			this.props.servicePath +
			'video/' +
			this.props.match.params.id +
			'/annotations_' +
			this.props.match.params.id +
			'.zip';
	}
	modeAnnotate() {
		this.setState({
			mode: this.state.mode === 0 ? 1 : 0,
			method: this.props.methods.ids[1],
		});
	}
	modeAddAnnotate(event, method) {
		this.setState({
			mode: this.state.mode === 1 ? 0 : 1,
			method: method,
		});
	}
	modeEditAnnotate(event, method) {
		this.setState({
			mode: this.state.mode === 2 ? 0 : 2,
			method: method,
		});
	}
	modeDeleteAnnotate(event, method) {
		this.setState({
			mode: this.state.mode === 3 ? 0 : 3,
			method: method,
		});
	}
	beginAnnotate(event) {
		var canvasDim = this.canvas.getBoundingClientRect();
		var scaleX = this.canvas.width / canvasDim.width;
		var scaleY = this.canvas.height / canvasDim.height;
		switch (this.state.mode) {
			case 1:
				this.state.drawing = {
					enabled: true,
					startX: (event.pageX - canvasDim.x - window.pageXOffset) * scaleX,
					startY: (event.pageY - canvasDim.y - window.pageYOffset) * scaleY,
					endX: 0,
					endY: 0,
				};
				break;
			case 2:
				this.selectAnnotate(event, this.state.method);
				break;
			case 3:
				this.deleteAnnotate(event, this.state.method);
				break;
		}
	}

	moveAnnotate(event) {
		switch (this.state.mode) {
			case 1:
				if (this.state.drawing.enabled) {
					this.drawAnalyses(this.state.detections);
					var canvasDim = this.canvas.getBoundingClientRect();
					var canvasCtx = this.canvas.getContext('2d');
					var scaleX = this.canvas.width / canvasDim.width;
					var scaleY = this.canvas.height / canvasDim.height;
					this.state.drawing.endX =
						(event.pageX - canvasDim.x - window.pageXOffset) * scaleX;
					this.state.drawing.endY =
						(event.pageY - canvasDim.y - window.pageYOffset) * scaleY;
				}
		}
	}
	endAnnotate(event) {
		switch (this.state.mode) {
			case 1:
				if (this.state.drawing.enabled) {
					var canvasDim = this.canvas.getBoundingClientRect();
					var scaleX = this.canvas.width / canvasDim.width;
					var scaleY = this.canvas.height / canvasDim.height;
					this.state.drawing.enabled = false;
					this.state.drawing.endX =
						(event.pageX - canvasDim.x - window.pageXOffset) * scaleX;
					this.state.drawing.endY =
						(event.pageY - canvasDim.y - window.pageYOffset) * scaleY;
					var detections = this.state.detections;
					var method = this.state.method;
					var founDet = false;
					detections.forEach(detection => {
						if (detection.id == method.id) {
							detection.results.detections.push({
								x1: this.state.drawing.startX,
								x2: this.state.drawing.endX,
								y1: this.state.drawing.startY,
								y2: this.state.drawing.endY,
							});
							detection.results.frameIndex = Math.floor(
								this.player.currentTime * this.props.video.fps
							);
							founDet = true;
						}
					});
					console.log(founDet);
					console.log(detections);
					if (!founDet) {
						detections.push({
							id: 1,
							name: 'manual',
							color: this.props.methods.ids[1].color,
							results: {
								detections: [
									{
										x1: this.state.drawing.startX,
										x2: this.state.drawing.endX,
										y1: this.state.drawing.startY,
										y2: this.state.drawing.endY,
									},
								],
								frameIndex: Math.floor(
									this.player.currentTime * this.props.video.fps
								),
							},
						});
						this.setState({ method: detections[detections.length - 1] });
					}

					this.setState({
						detections,
					});
					this.state.drawing = {
						enabled: false,
						startX: 0,
						startY: 0,
						endX: 0,
						endY: 0,
					};
					this.drawAnalyses(detections);
					this.updateAnalyses();
					this.props.uploadAnns(this.props.video); //this.props.match.params.id);
				}
		}
	}
	deleteAnnotate(event, method) {
		this.selectAnnotate(event, method);
		var detections = this.state.detections;
		var selection = this.state.selection;
		detections.forEach(detection => {
			if (detection.id === method.id) {
				selection = selection.sort((a, b) => b - a);
				while (selection.length > 0) {
					detection.results.detections.splice(selection.pop(), 1);
				}
			}
		});
		this.setState({ selection: selection, detections });
		this.drawAnalyses(this.state.detections);
		this.updateAnalyses();
		this.props.uploadAnns(this.props.video);
	}
	selectAnnotate(event, method) {
		var canvasDim = this.canvas.getBoundingClientRect();
		var scaleX = this.canvas.width / canvasDim.width;
		var scaleY = this.canvas.height / canvasDim.height;
		var x = (event.pageX - canvasDim.x - window.pageXOffset) * scaleX;
		var y = (event.pageY - canvasDim.y - window.pageYOffset) * scaleY;
		var detections = this.state.detections;
		var method = this.state.method;
		var selection = this.state.selection;
		detections.forEach(detection => {
			if (detection.id === method.id) {
				for (var i = 0; i < detection.results.detections.length; i++) {
					var q = detection.results.detections[i];
					if (q.x1 <= q.x2 && x >= q.x1 && x <= q.x2) {
						if (q.y1 <= q.y2 && y >= q.y1 && y <= q.y2) {
							if (selection.indexOf(i) !== -1) {
								selection.splice(selection.indexOf(i), 1);
							} else {
								selection.push(i);
							}
						} else if (q.y2 <= q.y1 && y >= q.y2 && y <= q.y1) {
							if (selection.indexOf(i) !== -1) {
								selection.splice(selection.indexOf(i), 1);
							} else {
								selection.push(i);
							}
						}
					} else if (q.x2 <= q.x1 && x >= q.x2 && x <= q.x1) {
						if (q.y1 <= q.y2 && y >= q.y1 && y <= q.y2) {
							if (selection.indexOf(i) !== -1) {
								selection.splice(selection.indexOf(i), 1);
							} else {
								selection.push(i);
							}
						} else if (q.y2 <= q.y1 && y >= q.y2 && y <= q.y1) {
							if (selection.indexOf(i) !== -1) {
								selection.splice(selection.indexOf(i), 1);
							} else {
								selection.push(i);
							}
						}
					}
				}
			}
		});
		this.setState({ selection: selection });

		this.drawAnalyses(this.state.detections);
	}
	updateAnalyses() {
		var detections = this.state.detections;
		var found = false;
		var foundframe = false;
		var videolength = this.props.video.fps * this.props.video.duration;
		detections.forEach(detection => {
			this.props.video.analyses.forEach(analysis => {
				if (detection.id == analysis.id) {
					found = true;
					analysis.results.forEach(result => {
						if (result.frameIndex == detection.results.frameIndex) {
							result.detections = detection.results.detections;
							foundframe = true;
						}
					});
					if (foundframe == false) {
						analysis.results.push({
							frameIndex: detection.results.frameIndex,
							detections: detection.results.detections,
						});
					}
				}
			});
			if (found == false) {
				var initresults = [];
				for (var i = 0; i < videolength; i++) {
					if (i != detection.results.frameIndex) {
						initresults.push({ frameIndex: i, detections: [] });
					} else {
						initresults.push({
							frameIndex: detection.results.frameIndex,
							detections: detection.results.detections,
						});
					}
				}
				this.props.video.analyses.push({
					id: 1,
					status: 'FINISHED',
					method: 1,
					results: initresults,
				});
			}
			found = false;
			foundframe = false;
		});
	}
	drawAnalyses(analyses) {
		if (this.player !== null) {
			var frame = Math.floor(this.player.currentTime * this.props.video.fps);
			var canvasCtx = this.canvas.getContext('2d');
			canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			canvasCtx.drawImage(
				this.player,
				0,
				0,
				this.canvas.width,
				this.canvas.height
			);

			analyses.forEach(analysis => {
				analysis.results.detections.map((item, i) => {
					canvasCtx.beginPath();
					canvasCtx.lineWidth = '6';
					canvasCtx.strokeStyle =
						this.state.method !== null &&
						analysis.id === this.state.method.id &&
						this.state.selection.indexOf(i) !== -1
							? 'white'
							: analysis.color;
					canvasCtx.rect(
						item.x1 <= item.x2 ? item.x1 : item.x2,
						item.y1 <= item.y2 ? item.y1 : item.y2,
						Math.abs(item.x1 - item.x2),
						Math.abs(item.y1 - item.y2)
					);
					canvasCtx.stroke();
					canvasCtx.closePath();
				});
			});
			switch (this.state.mode) {
				case 1:
					canvasCtx.beginPath();
					canvasCtx.lineWidth = '6';
					canvasCtx.strokeStyle = this.props.methods.ids[1].color;
					canvasCtx.strokeRect(
						this.state.drawing.startX,
						this.state.drawing.startY,
						this.state.drawing.endX - this.state.drawing.startX,
						this.state.drawing.endY - this.state.drawing.startY
					);
					canvasCtx.stroke();
					canvasCtx.closePath();
			}
		}
	}
	closeStatusBar = event => {
		event.stopPropagation();
		this.setState({
			statusClosed: true,
		});
	};
	updateLayout = () => {
		this.canvas.width = this.player.videoWidth;
		this.canvas.height = this.player.videoHeight;

		if (this.state.paused) {
			this.computeFrame(-1, true);
		}
	};
	componentDidMount() {
		this.props.requestVideo(this.props.match.params.id);
		window.addEventListener('resize', this.updateLayout);
	}
	componentWillUnmount() {
		window.removeEventListener('resize', this.updateLayout);
	}
	render() {
		var video = <Busy error={this.props.error} />,
			analyses,
			status,
			queued = 0,
			failed = 0,
			processing = 0;

		if (this.props.video && !this.props.error) {
			analyses = [];

			this.props.video.analyses.forEach(analysis => {
				if (analysis.status === 'FINISHED') {
					analyses.push(
						<OccurrencesBar
							key={analysis.id}
							analysis={analysis}
							color={this.props.methods.ids[analysis.method].color}
						/>
					);
				} else if (analysis.status === 'FAILED') {
					failed++;
				} else if (analysis.status === 'QUEUED') {
					queued++;
				} else {
					processing++;
				}
			});

			if ((failed || queued || processing) && !this.state.statusClosed) {
				status = (
					<React.Fragment>
						<div className="status-bar">
							{(failed && <span className="failed">{failed} failed</span>) ||
								''}{' '}
							{(queued && <span className="queued">{queued} queued</span>) ||
								''}{' '}
							{(processing && (
								<span className="processing">
									{processing} processing
									<em>...</em>
								</span>
							)) ||
								''}
						</div>
						<span
							className="close"
							onClick={this.closeStatusBar}
							onMouseDown={event => event.stopPropagation()}
							onMouseUp={event => event.stopPropagation()}
						>
							×
						</span>
					</React.Fragment>
				);
			}

			video = (
				<section>
					<header>
						<h2>{this.props.video.description}</h2>
						<div className="info">
							<span className="icon-label">Info</span>
							<i className="icon info" />
							<div className="popup">
								<div>
									<strong>Original File Name:</strong>{' '}
									{this.props.video.filename}
								</div>
								<div>
									<strong>FPS:</strong> {this.props.video.fps}
								</div>
								<div>
									<strong>Duration:</strong> {formatDuration(this.props.video)}
								</div>
							</div>
						</div>
						<Analyze vid={this.props.video.id} />
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
							onPlay={this.playFrame}
							onPause={() => this.setState({ paused: true })}
							onTimeUpdate={this.timeUpdate}
							onLoadedData={() => {
								if (this.player.readyState >= 2) {
									this.updateLayout();
								}
							}}
							crossOrigin="anonymous"
							playsInline
						>
							Sorry, this browser does not support video playback.
						</video>
						<canvas
							ref={canvas => (this.canvas = canvas)}
							onMouseDown={event => this.beginAnnotate(event)}
							onMouseMove={event => this.moveAnnotate(event)}
							onMouseUp={event => this.endAnnotate(event)}
						/>
						<div
							className="analyses"
							onMouseDown={this.scrubStart}
							onMouseMove={this.scrubChange}
							onMouseUp={this.scrubEnd}
						>
							{status}
							{analyses}
							<div
								className="scrubber"
								style={{ left: this.state.scrubber + 'px' }}
							/>
						</div>
					</div>
					<div className="annotations">
						<h3>Detections and Annotations</h3>
						<ul>
							{this.state.detections.map(method => (
								<li key={method.id} className="method">
									<span className="box" style={{ background: method.color }} />
									<h4>{method.name}</h4>
									<Button
										className={
											this.state.mode === 1 && method.id == this.state.method.id
												? 'add-mode'
												: 'dis-add-mode'
										}
										onMouseDown={event => this.modeAddAnnotate(event, method)}
										iconOnly
									>
										Add
									</Button>
									<Button
										className={
											this.state.mode === 3 && method.id == this.state.method.id
												? 'del-mode'
												: 'dis-del-mode'
										}
										onMouseDown={event =>
											this.modeDeleteAnnotate(event, method)
										}
										iconOnly
									>
										Delete
									</Button>
									<ul>
										{(method.name === 'manual' &&
											method.results.detections.map((detection, index) => (
												<li key={method.id + '-' + index}>Fish {index + 1}</li>
											))) ||
											(method.results.detections.length && (
												<li key={method.id + '-count'}>
													Fish {method.results.detections.length}
												</li>
											)) ||
											''}
									</ul>
								</li>
							))}
						</ul>
					</div>
					<div className="controls">
						<Button
							className="rewind"
							onMouseDown={event => this.rewind(event, true)}
							onMouseUp={event => this.rewind(event, false)}
							iconOnly
						>
							Rewind
						</Button>
						<Button className="previous-frame" iconOnly>
							Previous Frame
						</Button>
						{this.state.paused ? (
							<Button
								className="play"
								onClick={() => this.player.play()}
								iconOnly
							>
								Play
							</Button>
						) : (
							<Button
								className="pause"
								onClick={() => this.player.pause()}
								iconOnly
							>
								Pause
							</Button>
						)}
						<Button className="next-frame" iconOnly>
							Next Frame
						</Button>
						<Button
							className="fast-forward"
							onMouseDown={event => this.fastForward(event, true)}
							onMouseUp={event => this.fastForward(event, false)}
							iconOnly
						>
							Fast Forward
						</Button>
					</div>
					<div className="options">
						<Button
							className={this.state.mode === 1 ? 'annotate-edit' : 'annotate'}
							onMouseDown={event => this.modeAnnotate(event)}
						>
							Annotation
						</Button>
						<Button
							className="download"
							onMouseDown={event => this.downloadAnnotations(event)}
						>
							Download
						</Button>
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
				<Link to={'/video/' + this.props.match.params.id + '/summary'}>
					See Summary
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
		uploadAnns: ann,
	}
)(Video);
