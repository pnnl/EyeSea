import React, { Component } from 'react';
import $ from 'jquery';

class Analysis extends Component {
    constructor(props) {
	super(props);
	this.state = {data: {}};

	this.uploadFile = this.uploadFile.bind(this);
    }

    uploadFile(ev) {
	alert("this");
    }
    
    render() {
	const data = this.state.data;
	
	return (
	    <div className="Analysis">
	      <form onSubmit={this.uploadFile}>
		<div>
		  Description:
		  <input ref={(ref) => {this.desc = ref;}} type="text"></input>
		  <br />
		  File:
		  <input ref={(ref) => {this.file = ref;}} type="file"></input>
		  <br />
		  URI:
		  <input ref={(ref) => {this.uri = ref;}} type="text"></input>
		  <br />
		  <button>Submit</button>
		</div>
	      </form>
	    </div>
	);
    }
}

export default Analysis;
