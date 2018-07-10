import React from 'react';
import { connect } from 'react-redux';
import { Switch, Route, withRouter } from 'react-router-dom';
import { setServicePath } from './app/module';
import Button from './app/util/Button';
import Introduction from './app/Introduction';
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
					<h1>EyeSea</h1>
					<div>
						<Button className="add" wide>
							Add Video(s)
						</Button>
						<Button className="settings" wide>
							Settings
						</Button>
					</div>
				</header>
				<Switch>
					<Route exact path="/" component={Videos} />
					<Route exact path="/new" component={Introduction} />
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
