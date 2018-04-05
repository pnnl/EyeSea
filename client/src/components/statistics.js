import React, { Component } from 'react';
import $ from 'jquery';

class Statistics extends Component {
    constructor(props) {
	super(props);
	this.state = {data: {}};
    }

    componentDidMount() {
	$.ajax({
	    type: 'GET',
	    url: "http://127.0.0.1:8080/statistics",
	    dataType: "json",
	    cache: false,
	    success:  function(data) {
		this.setState({data: data});
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
	    <div className="Statistics">
	      <ul>
		{listItems}
	      </ul>
	    </div>
	);
    }
}

export default Statistics;
