import React from 'react';
import {
	generateAccessibleKeyUpClickHandler,
	generateAccessibleKeyDownClickHandler,
} from '../events';
import './Button.scss';

export default class Button extends React.PureComponent {
	render() {
		return (
			<span
				className={
					'btn ' +
					(this.props.wide ? ' wide ' : '') +
					(this.props.disabled ? ' disabled ' : '') +
					(this.props.className || '')
				}
				role="button"
				tabIndex="0"
				onKeyDown={generateAccessibleKeyDownClickHandler(
					this.props.onMouseDown
						? event => {
								this.props.onMouseDown(event);
								this.props.onClick && this.props.onClick(event);
						  }
						: this.props.onClick
				)}
				onKeyUp={generateAccessibleKeyUpClickHandler(
					this.props.onMouseUp
						? event => {
								this.props.onMouseUp(event);
								this.props.onClick && this.props.onClick(event);
						  }
						: this.props.onClick
				)}
				onMouseDown={event => {
					event.preventDefault();
					this.props.onMouseDown && this.props.onMouseDown(event);
				}}
				onMouseUp={this.props.onMouseUp}
				onClick={this.props.onClick}
			>
				{this.props.iconOnly ? (
					<span className="icon-label">{this.props.children}</span>
				) : (
					this.props.children
				)}
			</span>
		);
	}
}
