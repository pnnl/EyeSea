import React from 'react';
import { connect } from 'react-redux';
import { FileSelectButton } from '../Uploader';
import { getSupportedVideoFormats } from '../module';
import './Introduction.scss';

export class Introduction extends React.Component {
	render() {
		return (
			<section className="introduction">
				<h2>Welcome to EyeSea</h2>
				<p>
					To get started, click the "Upload a Video" button below 
					(or "Add Video(s)" above)  to add a video file to your database.  
					After you select the video file 
					to add, you will be asked to select an analysis method.  The method 
					will be applied to the selected video. 
				</p>
				<p>
				    When the analysis is complete,
					the results will be shown under the video thumbnail.  Click on the 
					thumbnail to view the results, edit them and add manual annotations.
				</p>
				<h2>Get Started</h2>
				<FileSelectButton className="upload">Upload a Video</FileSelectButton>
			</section>
		);
	}
}

const mapStateToProps = state => ({
	supportedVideoFormats: getSupportedVideoFormats(state),
});

export default connect(
	mapStateToProps,
	{}
)(Introduction);
