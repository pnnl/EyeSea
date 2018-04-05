import React, { Component } from 'react';
import $ from 'jquery';

class Review extends Component {
    constructor(props) {
	super(props);
	this.state = {data: {}};

	this.rewrite = this.rewrite.bind(this);
    }

    rewrite(data) {
	if (data.uri.includes("file://")){
	    data.uri = "/file/" + data.uri.replace("file://", "");
	}
	return data;
    }

    componentDidMount() {
	$.ajax({
	    type: 'GET',
	    url: "http://127.0.0.1:8080/video",
	    dataType: "json",
	    cache: false,
	    success:  function(data) {
		this.setState({data: this.rewrite(data)});
	    }.bind(this),
	    error: function(xhr, status, err) {
		console.error(this.props.url, status, err.toString());
	    }.bind(this)
	});
    }
    
    render() {
	const data = this.state.data;
	const listItems = Object.keys(data).map((item) =>
						<li key = {item}>{item} : {data[item]}</li>);
	return (
	    <div className="Review">
	      <ul>
		{listItems}
		<video src="http://127.0.0.1:8080/file/orpc_adults_then_smolt.mp4" ></video>
	      </ul>
	    </div>
	);
    }
}

export default Review;
