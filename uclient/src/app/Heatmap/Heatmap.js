import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import { getServicePath, getAnalysisMethodsById } from '../module';
import {
	request as requestHeatmap,
	getHeatmap,
	getHeatmapError,
} from './module';
import './Heatmap.scss';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import addHeatmapModule from 'highcharts/modules/heatmap';
import { options } from './chart';

addHeatmapModule(Highcharts);

const buildOptions = heatmap => {
	const updated = Object.assign({}, options);
	updated.data = heatmap ? heatmap.data : [];
	updated.colorAxis.max = heatmap ? heatmap.maxdet : 1000;
	return updated;
};

export class Heatmap extends React.PureComponent {
	static defaultProps = {
		options: buildOptions(),
	};

	constructor(props) {
		super(props);
		this.heatmap = React.createRef();
	}

	updateOptions() {
		const { heatmap } = this.props;
		if (heatmap && this.heatmap.current) {
			this.heatmap.current.chart.update(
				{
					data: heatmap ? heatmap.data : [],
					colorAxis: {
						max: heatmap ? heatmap.maxdet : 1000,
					},
				},
				true,
				undefined,
				false
			);
			console.log('updated');
		}
	}

	componentDidMount() {
		const { match } = this.props;
		this.props.requestHeatmap(match.params.id);
	}

	render() {
		const { options } = this.props;
		this.updateOptions();
		console.log(options);
		return (
			<div className="heatmap">
				<HighchartsReact
					ref={this.heatmap}
					highcharts={Highcharts}
					options={options}
				/>
			</div>
		);
	}
}

const mapStateToProps = state => ({
	servicePath: getServicePath(state),
	heatmap: getHeatmap(state),
	error: getHeatmapError(state),
	methods: getAnalysisMethodsById(state),
	options: buildOptions(getHeatmap(state)),
});

export default connect(
	mapStateToProps,
	{
		requestHeatmap,
	}
)(Heatmap);
