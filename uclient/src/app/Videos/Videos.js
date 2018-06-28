import React from 'react';
import { connect } from 'react-redux';
import { Redirect, Link } from 'react-router-dom';
import _ from 'lodash';
import { formatDuration } from '../util/videos';
import {
	request,
	setPadding,
	getPadding,
	getVideos,
	getVideosError,
	getSort,
	setSort,
} from './module';
import { getServicePath, getAnalysisMethodsById } from '../module';
import Busy from '../Busy';
import StackedOccurrencesGraph from './StackedOccurrencesGraph';
import BarGraph from './BarGraph';
import './Videos.scss';

export class Videos extends React.PureComponent {
	constructor() {
		super();
		this.checkLayout = _.debounce(this.checkLayout, 125);
	}
	onSortPropertyChange = event => {
		this.props.setSort({
			property: event.target.dataset.property,
			ascending: false,
		});
	};
	onSortDirectionChange = event => {
		this.props.setSort(event);
	};
	checkLayout = () => {
		if (this.container) {
			var offsetWidth = this.container.offsetWidth;
			var padding =
				(offsetWidth - Math.floor((offsetWidth - 175) / 320) * 320 + 25) / 2;

			if (padding !== this.props.padding) {
				this.props.setPadding(padding);
			}
		}
	};
	componentDidMount() {
		this.props.requestVideos();
		window.addEventListener('resize', this.checkLayout);
	}
	componentDidUpdate() {
		this.checkLayout();
	}
	componentWillUnmount() {
		window.removeEventListener('resize', this.checkLayout);
	}
	render() {
		if (this.props.videos && !this.props.videos.length) {
			return <Redirect to="/new" />;
		} else {
			let count = (this.props.videos && this.props.videos.length) || 0;
			let byDate = this.props.sortBy.property === 'Added Date';
			return (
				<section
					ref={ref => (this.container = ref)}
					className="videos"
					style={{
						paddingLeft: this.props.padding + 'px',
						paddingRight: this.props.padding - 25 + 'px',
					}}
				>
					<header>
						Sort By:
						<div className={'sortBy' + (byDate ? ' selected' : '')}>
							<span
								data-property="Added Date"
								onMouseDown={event => event.preventDefault()}
								onClick={this.onSortPropertyChange}
							>
								Added Date
							</span>
							<SortIndicator
								property="Added Date"
								ascending={this.props.sortBy.ascending}
								onChange={this.onSortDirectionChange}
							/>
						</div>
						<div className={'sortBy' + (byDate ? '' : ' selected')}>
							<span
								data-property="Progress"
								onMouseDown={event => event.preventDefault()}
								onClick={this.onSortPropertyChange}
							>
								Progress
							</span>
							<SortIndicator
								property="Progress"
								ascending={this.props.sortBy.ascending}
								onChange={this.onSortDirectionChange}
							/>
						</div>
					</header>
					{(this.props.videos &&
						this.props.videos.map(video => (
							<Link key={video.id} className="video" to={'/video/' + video.id}>
								<h3 title={video.filename}>{video.filename}</h3>
								<span>{formatDuration(video)}</span>
								<img
									src={
										this.props.servicePath + 'video/' + video.id + '/thumbnail'
									}
									alt={'Preview of ' + video.filename}
								/>
								<StackedOccurrencesGraph
									values={video.analyses}
									colors={this.props.methods}
								/>
							</Link>
						))) || <Busy error={this.props.error} />}
				</section>
			);
		}
	}
}
const mapStateToProps = state => ({
	servicePath: getServicePath(state),
	padding: getPadding(state),
	videos: getVideos(state),
	error: getVideosError(state),
	sortBy: getSort(state),
	methods: getAnalysisMethodsById(state),
});

export default connect(
	mapStateToProps,
	{
		requestVideos: request,
		setPadding,
		setSort,
	}
)(Videos);

export class SortIndicator extends React.PureComponent {
	render() {
		return (
			<span className="sort-indicator">
				<span
					className={'btn ' + (this.props.ascending ? 'selected' : '')}
					onClick={event =>
						this.props.onChange({
							property: this.props.property,
							ascending: true,
						})
					}
				>
					<span className="icon-label">Sort ascending</span>
					<i className="fa fa-fw fa-sort-up" />
				</span>
				<span
					className={'btn ' + (!this.props.ascending ? 'selected' : '')}
					onClick={event =>
						this.props.onChange({
							property: this.props.property,
							ascending: false,
						})
					}
				>
					<span className="icon-label">Sort descending</span>
					<i className="fa fa-fw fa-sort-down" />
				</span>
			</span>
		);
	}
}
