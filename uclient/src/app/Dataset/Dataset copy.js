import React from 'react';
import { connect } from 'react-redux';
import { generateAccessibleKeyUpClickHandler } from '../util/events';
import { Redirect } from 'react-router-dom';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import * as moment from 'moment';
import { Button } from '../shared';
import {
	getSupportedVideoFormats,
	getAnalysisMethods,
	getAnalysisMethodsById,
	getAnalysisMethodsError,
} from '../module';
import FileSelectButton from './FileSelectButton';
import {
	request,
	setFiles,
	setDescription,
	reset,
	addAlgorithmInstance,
	deleteAlgorithmInstance,
	enableAlgorithmInstance,
	enableCustomAlgorithmInstanceParameters,
	setCustomAlgorithmInstanceParameters,
	dismissError,
	getFiles,
	getDescription,
	getAlgorithmInstances,
	getRequest,
	getResult,
	getError,
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
		redirect: false,
		dataset: 1,
	};

	onUpload = event => {
		this.setState({ redirect: true });
		this.props.dataset(event);
	};

	}
	componentDidUpdate() {
		if (this.props.result && !this.props.result.progress) {
			this.props.reset();
			this.setState({ redirect: false });
		}
	}

	render() {
		var popup, error;
		if (this.props.files) {
			if (this.props.error) {
				error = (
					<div className="popup-overlay">
						<div className="popup error">
							<h3>
								{this.props.error.message.error || "We've encountered an error"}
							</h3>
							<p>The server had this to say:</p>
							<p className="details">
								{this.props.error.message.details ||
									this.props.error.message.error}
							</p>
							<div className="buttons">
								<Button className="ok" onClick={this.props.dismissError}>
									OK
								</Button>
							</div>
						</div>
					</div>
				);
			}
			popup = (
				<div className="popup-overlay">
					<div
						className={
							'popup' +
							(this.props.request &&
							(!this.props.result ||
								this.props.result.progress === 'indefinite')
								? ' busy'
								: '')
						}
					>
						<h3>Select Dataset</h3>
						<Select options={Countries}
						//	value=this.state.dataset // this generates an error
						/*
							onBlurResetsInput={false}
							onSelectResetsInput={false}
							placeholder={'Select a database to open\u2026'}
							options={this.props.methods.list
								.filter(method => method.automated)
								.map(method => ({
									value: method.mid,
									label: this.formatDescription(method),
								}))}
							simpleValue
							value=""
							onChange={value =>
								this.props.addAlgorithmInstance(this.props.methods.ids[value])
							}
							searchable={false}
							*/
						/>

						<div className="buttons">
							<Button
								className="open"
								onClick={this.onUpload}
								disabled={
									!this.props.algorithms.length ||
									!this.props.description ||
									this.props.request
								}
							>
								Open
							</Button>
							<Button
								className="cancel"
								onClick={() => this.props.setFiles(null)}
								disabled={this.props.request}
							>
								Cancel
							</Button>
						</div>
						{this.props.result && this.props.result.progress !== 'indefinite' && (
							<svg width="100%" height="100%">
								<circle className="background" cx="0" cy="0" r="15.9155" />
								<circle
									className="foreground"
									cx="0"
									cy="0"
									r="15.9155"
									style={{
										strokeDasharray: this.props.result.progress * 100 + ' 100',
									}}
								/>
							</svg>
						)}
					</div>
					{error}
				</div>
			);
		}
		const isRoot = window.location.href.endsWith('/#/');
		if (
			(!isRoot && this.state.redirect) ||
			(this.props.result && !this.props.result.progress && !this.props.error)
		) {
			popup = <Redirect to="/" />;
		}
		return (
			<div className="dataset">
				<FileSelectButton className="select" wide>
					Dataset
				</FileSelectButton>
				{popup}
			</div>
		);
	}
}
const mapStateToProps = state => ({
	files: getFiles(state),
	description: getDescription(state),
	request: getRequest(state),
	result: getResult(state),
	methods: {
		list: getAnalysisMethods(state),
		ids: getAnalysisMethodsById(state),
	},
	analysisMethodsError: getAnalysisMethodsError(state),
	error: getError(state),
});

export default connect(
	mapStateToProps,
	{
		dataset: request,
		setFiles,
		setDescription,
		reset,
		dismissError,
	}
)(Dataset);
