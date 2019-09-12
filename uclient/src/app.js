// Copyright 2018 Battelle Memorial Institute. All rights reserved.

import React from 'react';
import { connect } from 'react-redux';
import { Switch, Route, withRouter } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { setServicePath } from './app/module';
import Uploader from './app/Uploader';
import { Button } from './app/shared';
import Videos from './app/Videos';
import Video from './app/Video';
import Summary from './app/Summary';
import Error404 from './app/errors/404';
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
					<Link to="/">
						<h1>EyeSea</h1>
					</Link>
					<div>
						<Uploader />
						<Button className="settings" wide disabled>
							Settings
						</Button>
					</div>
				</header>
				<Switch>
					<Route exact path="/" component={Videos} />
					<Route path="/video/:id/summary" component={Summary} />
					<Route path="/video/:id" component={Video} />
					<Route component={Error404} />
				</Switch>
			</main>
		);
	}
}

export default withRouter(
	connect(
		null,
		{
			setServicePath,
		}
	)(App)
);
