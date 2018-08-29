import React from 'react';
import { connect } from 'react-redux';
import Button from '../../util/Button';
import { getSupportedVideoFormats } from '../../module';
import { popAnalyze } from '../module';

export class AnalyzeSelectButton extends React.PureComponent {
	render() {
		return (
			<Button
				className={this.props.className}
				onClick={event => this.props.popAnalyze(this.props.vid)}
				accept={this.props.supportedVideoFormats}
				wide={this.props.wide}
				disabled={this.props.disabled}
			>
				{this.props.children}
			</Button>
		);
	}
}
const mapStateToProps = state => ({
	supportedVideoFormats: getSupportedVideoFormats(state),
});

export default connect(
	mapStateToProps,
	{
		popAnalyze,
	}
)(AnalyzeSelectButton);
