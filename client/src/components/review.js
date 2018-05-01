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
	    data.uri = data.uri.replace("file://", "");
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
		<video src="http://127.0.0.1:8080/file//home/avil982/Videos/1_East_fish_20170627_130000/WellsDam_1_East_20170627_13_1050-1080.mp4" ></video>
	      </ul>
	    </div>
	);
    }
}

export default Review;
