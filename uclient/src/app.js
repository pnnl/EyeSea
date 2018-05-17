import React from 'react';
import { Route } from 'react-router-dom';
import Introduction from './app/introduction';
import Videos from './app/videos';
import '../styles/index.scss';

export class App extends React.Component {
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
				<Route exact path="/" component={Introduction} />
				<Route exact path="/videos" component={Videos} />
			</main>
		);
	}
}

export default App;
