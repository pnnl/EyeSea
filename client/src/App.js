import React, { Component } from 'react';
import $ from 'jquery';
import './App.css';

import Menu from './components/menu';
import Statistics from './components/statistics';
import Review from './components/review';

class App extends Component {
    constructor(props) {
	super(props);
	this.state = {mode: ''};

	this.loadMode = this.loadMode.bind(this);
    }

    loadMode(newMode) {
	this.setState({mode: newMode});
    }
    render() {
	const mode = this.state.mode;
	const activity = mode === "statistics" ? <Statistics /> :
	      (mode === "analysis" ? "analyses" :
	       (mode === "review" ? <Review /> : ''));

	return (
	    <div className="App">
	      <Menu menuMode = {mode} modeChange={this.loadMode}/>
	      {activity}
	    </div>
	);
    }
}

export default App;
