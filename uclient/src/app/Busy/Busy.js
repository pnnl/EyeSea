import React from 'react';
import './Busy.scss';

export default class Busy extends React.PureComponent {
	render() {
		return (
			<div className={'fish-loader' + (this.props.error ? ' dead' : '')}>
				<span>&gt;&lt;)){this.props.error ? <sup>✕</sup> : '°'}&gt;</span>
			</div>
		);
	}
}
