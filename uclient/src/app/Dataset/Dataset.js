import React from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import { getServicePath } from '../module';
import {
	request as requestDatasets,
	getDatasets,
	getError,
    setDataset,
} from './module';
import './Dataset.scss';

const Countries = [
  { label: "Albania", value: 355 },
  { label: "Argentina", value: 54 },
  { label: "Austria", value: 43 },
  { label: "Cocos Islands", value: 61 },
  { label: "Kuwait", value: 965 },
  { label: "Sweden", value: 46 },
  { label: "Venezuela", value: 58 }
];

export class Dataset extends React.PureComponent {
	state = {
		datasets: "",
		selectedDataset: "",
	};


    // from Video.js
    onDatasetChange = event => {
       this.props.setDataset(event);
    };

    handleChange = selectedDataset => {
        this.setState({selectedDataset});
        console.log('selected:', this.state.selectedDataset.label)
        //this.props.setDataset(selectedDataset.label)

    };

	componentDidMount() {
 		this.props.requestDatasets();
		// here servicePath is defined, datasets is undefined
		console.log(`props:`, this.props)
	}

	render() {
        //const {selectedDataset} = this.state.selectedDataset
        var datasetOptions = this.state.datasets

		if (this.props.datasets && this.props.datasets.length) {
			console.log('render', this.props.datasets.length)
            datasetOptions = this.props.datasets
		}

		
		return (
			<div>
				<Select 
                   value={this.state.selectedDataset}
                    onChange={this.handleChange}
                    options={datasetOptions}
				>
      			</Select>
			</div>
		);

	}
}

const mapStateToProps = state => ({
    servicePath: getServicePath(state),
     datasets: getDatasets(state),
});

export default connect(
    mapStateToProps,
    {
        requestDatasets,
    }
)(Dataset);

