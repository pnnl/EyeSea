import React from 'react';
import { connect } from 'react-redux';
import Button from '../../util/Button';
import { getSupportedVideoFormats } from '../../module';
import { setFiles } from '../module';

export class FileSelectButton extends React.PureComponent {
	render() {
		return (
			<Button
				className={this.props.className}
				onSelect={files => this.props.setFiles(files)}
				file
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
		setFiles,
	}
)(FileSelectButton);
