import React from 'react';
import { Link } from 'react-router-dom';
import './Error404.scss';

export default class Error404 extends React.PureComponent {
	render() {
		return (
			<div className="error-404">
				<h2>Page Not Found</h2>
				<span className="hook">
					°<span>ɾ</span>
				</span>
				<p>End of the line. <Link to="/">Reel yourself back in</Link>.</p>
			</div>
		);
	}
}
