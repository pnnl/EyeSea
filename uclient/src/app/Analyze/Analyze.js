import React from 'react';
import { connect } from 'react-redux';
import {
	generateAccessibleKeyUpClickHandler,
	generateAccessibleKeyDownClickHandler,
} from '../util/events';
import { Redirect } from 'react-router-dom';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import * as moment from 'moment';
import Button from '../util/Button';
import {
	getSupportedVideoFormats,
	getAnalysisMethods,
	getAnalysisMethodsById,
	getAnalysisMethodsError,
} from '../module';
import AnalyzeSelectButton from './AnalyzeSelectButton';
import {
	request,
	popAnalyze,
	setDescription,
	reset,
	addAlgorithmInstance,
	deleteAlgorithmInstance,
	enableAlgorithmInstance,
	enableCustomAlgorithmInstanceParameters,
	setCustomAlgorithmInstanceParameters,
	dismissError,
	getAnalyze,
	getDescription,
	getAlgorithmInstances,
	getRequest,
	getResult,
	getError,
} from './module';
import './Analyze.scss';

export class Analyze extends React.PureComponent {
	handleEnableAlgorithm = algorithm => event =>
		this.props.enableAlgorithmInstance(algorithm, algorithm.disabled);
	handleEnableParameters = algorithm => event =>
		this.props.enableCustomAlgorithmInstanceParameters(
			algorithm,
			!algorithm.allowParameters
		);
	setInstanceParameters = (algorithm, instance) => {
		var parameters = {};
		Array.from(
			document.getElementById(instance).querySelectorAll('input')
		).forEach(input => {
			parameters[input.name] = input.value;
		});
		this.props.setCustomAlgorithmInstanceParameters(
			algorithm,
			parameters,
			true
		);
	};
	revertInstanceParameters = algorithm => event =>
		this.props.setCustomAlgorithmInstanceParameters(
			algorithm,
			this.props.methods.ids[algorithm.mid].parameters
		);
	formatDescription(method) {
		var description = method.description;
		if (method.creationDate) {
			description += ' (';
			description += moment(method.creationDate * 1000).format(
				'YYYY-MM-DD HH:mm:ss'
			);
			description += ')';
		}
		return description;
	}
	componentDidUpdate() {
		if (this.props.result && !this.props.result.progress) {
			this.props.reset();
		}
	}
	render() {
		var popup, error;
		if (this.props.pAnalyze) {
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
						<h3>Select one or more algorithms for automation</h3>
						<Select
							onBlurResetsInput={false}
							onSelectResetsInput={false}
							placeholder={'Select an algorithm to add\u2026'}
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
						/>
						<ul>
							{this.props.algorithms &&
								this.props.algorithms.map(algorithm => (
									<li key={algorithm.id}>
										<span
											className="box"
											style={{ color: algorithm.color }}
											role="checkbox"
											aria-checked={!algorithm.disabled}
											tabIndex="0"
											onKeyUp={generateAccessibleKeyUpClickHandler(
												this.handleEnableAlgorithm(algorithm)
											)}
											onClick={this.handleEnableAlgorithm(algorithm)}
										/>
										<span
											className="toggle"
											role="button"
											aria-controls={'a' + algorithm.id}
											aria-expanded={!!algorithm.allowParameters}
											tabIndex="0"
											onKeyUp={generateAccessibleKeyUpClickHandler(
												this.handleEnableParameters(algorithm)
											)}
											onClick={this.handleEnableParameters(algorithm)}
										>
											<i
												className={
													'icon fa fa-fw fa-chevron-' +
													(algorithm.allowParameters ? 'down' : 'right')
												}
											/>
											<span className="icon-label">
												{algorithm.allowParameters
													? 'Close parameters'
													: 'Open parameters'}
											</span>
										</span>
										<h4>{this.formatDescription(algorithm)}</h4>
										<span
											className="delete"
											roll="button"
											title="Delete algorithm instance"
											tabIndex="0"
											onKeyUp={generateAccessibleKeyUpClickHandler(event =>
												this.props.deleteAlgorithmInstance(algorithm)
											)}
											onClick={event =>
												this.props.deleteAlgorithmInstance(algorithm)
											}
										>
											<i className="fa fa-times" />
											<span className="icon-label">
												delete algorithm instance
											</span>
										</span>
										{Object.keys(algorithm.parameters).length ? (
											<table id={'a' + algorithm.id} className="parameters">
												<thead>
													<tr>
														<th>Parameter</th>
														<th>
															Value
															{algorithm.dirty && (
																<Button
																	className="revert"
																	onClick={this.revertInstanceParameters(
																		algorithm
																	)}
																	iconOnly
																>
																	Revert to original paramters
																</Button>
															)}
														</th>
													</tr>
												</thead>
												<tbody>
													{Object.keys(algorithm.parameters).map(
														(parameter, index) => (
															<tr key={algorithm.id + '-' + parameter}>
																<td>{parameter}</td>
																<td className="value">
																	<input
																		name={parameter}
																		onChange={event =>
																			this.setInstanceParameters(
																				algorithm,
																				'a' + algorithm.id
																			)
																		}
																		value={algorithm.parameters[parameter]}
																	/>
																</td>
															</tr>
														)
													)}
												</tbody>
											</table>
										) : (
											<p className="parameters">
												This algortihm is not configurable.
											</p>
										)}
									</li>
								))}
						</ul>
						<div className="buttons">
							<Button
								className="save"
								onClick={this.props.upload}
								disabled={!this.props.algorithms.length || this.props.request}
							>
								Select
							</Button>
							<Button
								className="cancel"
								onClick={event => this.props.popAnalyze(null)}
								disabled={this.props.request}
							>
								Cancel
							</Button>
						</div>
						{this.props.result &&
							this.props.result.progress !== 'indefinite' && (
								<svg width="100%" height="100%">
									<circle className="background" cx="0" cy="0" r="15.9155" />
									<circle
										className="foreground"
										cx="0"
										cy="0"
										r="15.9155"
										style={{
											strokeDasharray:
												this.props.result.progress * 100 + ' 100',
										}}
									/>
								</svg>
							)}
					</div>
					{error}
				</div>
			);
		}
		if (this.props.result && !this.props.result.progress && !this.props.error) {
			popup = <Redirect to="/" />;
		}
		return (
			<div className="analyze">
				<AnalyzeSelectButton className="add" vid={this.props.vid} wide>
					Analyze Video
				</AnalyzeSelectButton>
				{popup}
			</div>
		);
	}
}
const mapStateToProps = state => ({
	supportedVideoFormats: getSupportedVideoFormats(state),
	pAnalyze: getAnalyze(state),
	description: getDescription(state),
	algorithms: getAlgorithmInstances(state),
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
		upload: request,
		popAnalyze,
		setDescription,
		reset,
		addAlgorithmInstance,
		deleteAlgorithmInstance,
		enableAlgorithmInstance,
		enableCustomAlgorithmInstanceParameters,
		setCustomAlgorithmInstanceParameters,
		dismissError,
	}
)(Analyze);
