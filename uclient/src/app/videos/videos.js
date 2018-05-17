import React from 'react';
import { connect } from 'react-redux';
import { request, getVideos } from './module';
import './videos.scss';

export class Videos extends React.Component {
	formatDuration(value) {
		var hours = Math.floor(value / 3600);
		var minutes = Math.floor((value - hours * 3600) / 60);
		var seconds = value - hours * 3600 - minutes * 60;

		if (hours < 10) {
			hours = '0' + hours;
		}
		if (minutes < 10) {
			minutes = '0' + minutes;
		}
		if (seconds < 10) {
			seconds = '0' + seconds;
		}

		return hours + ':' + minutes + ':' + seconds;
	}
	componentDidMount() {
		this.props.requestVideos();
	}
	render() {
		var count = (this.props.videos && this.props.videos.length) || 0;
		var padding =
			(window.innerWidth -
				Math.floor((window.innerWidth - 175) / 320) * 320 -
				25) /
			2;
		return (
			<section
				className="videos"
				style={{
					paddingLeft: padding + 'px',
					paddingRight: padding - 25 + 'px',
				}}
			>
				<header>
					Sort By:
					<div className="sortBy selected">
						<span>Added Date</span>
						<SortIndicator onChange={() => {}} />
					</div>
					<div className="sortBy">
						<span>Progress</span>
						<SortIndicator onChange={() => {}} />
					</div>
				</header>
				{this.props.videos &&
					this.props.videos.map(video => (
						<div key={video.name} className="video">
							<h3>{video.name}</h3>
							<span>{this.formatDuration(video.duration)}</span>
							<img src={video.preview} alt={'Preview of ' + video.name} />
						</div>
					))}
			</section>
		);
	}
}
const mapStateToProps = state => ({
	videos: getVideos(state),
});

export default connect(mapStateToProps, {
	requestVideos: request,
})(Videos);

export class SortIndicator extends React.PureComponent {
	render() {
		return (
			<span className="sort-indicator">
				<span
					className={'btn ' + (this.props.ascending ? 'selected' : '')}
					onClick={() => this.props.onChange({ ascending: true })}
				>
					<span className="icon-label">Sort ascending</span>
					<i className="fa fa-fw fa-sort-up" />
				</span>
				<span
					className={'btn ' + (!this.props.ascending ? 'selected' : '')}
					onClick={() => this.props.onChange({ ascending: false })}
				>
					<span className="icon-label">Sort descending</span>
					<i className="fa fa-fw fa-sort-down" />
				</span>
			</span>
		);
	}
}
