import React, { Component } from 'react';

class Menu extends Component {
    constructor(props) {
	super(props);
	this.menuClick = this.menuClick.bind(this);
    }
    
    menuClick(e) {
	this.props.modeChange(e.target.value);
    }

    
    render() {
	return (
	    <div className="Menu">
	      <div><button onClick={this.menuClick} disabled={this.props.menuMode === "statistics" ? true : false} value="statistics">Statistics</button></div>
	      <div><button onClick={this.menuClick} disabled={this.props.menuMode === "analysis" ? true : false} value="analysis">Analysis</button></div>
	      <div><button onClick={this.menuClick} disabled={this.props.menuMode === "review" ? true : false} value="review">Review</button></div>
	    </div>
	);
    }
}

export default Menu;
