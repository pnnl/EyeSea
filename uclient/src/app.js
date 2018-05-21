import React from 'react';
import { connect } from 'react-redux';
import { Route } from 'react-router-dom';
import { setServicePath } from './app/module';
import Introduction from './app/Introduction';
import Videos from './app/Videos';
import '../styles/index.scss';

export class App extends React.Component {
	componentWillMount() {
		this.props.setServicePath(this.props.servicePath);
	}
	componentDidMount() {
		document.getElementById('app').classList.remove('loading');
	}
	render() {
		return (
			<main>
				<header>
					<h1>EyeSea</h1>
					<div>
						<button>
							<i className="fa fa-plus" />
							Add Video(s)
						</button>
						<button>
							<i className="fa fa-sliders" />
							Settings
						</button>
					</div>
				</header>
				<Route exact path="/" component={Videos} />
				<Route exact path="/new" component={Introduction} />
			</main>
		);
	}
}

export default connect(null, {
	setServicePath,
})(App);
