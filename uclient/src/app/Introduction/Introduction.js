import React from 'react';

import './Introduction.scss';

export class Introduction extends React.Component {
	render() {
		return (
			<section className="introduction">
				<h2>Introduction</h2>
				<p>
					Cheese triangles fromage frais stinking bishop. Pecorino rubber cheese
					ricotta cow lancashire edam mozzarella cheesy grin. Chalk and cheese
					cheese slices cheese slices red leicester cheese and biscuits cheesy
					feet airedale dolcelatte. Roquefort cheddar port-salut mascarpone
					halloumi monterey jack paneer halloumi. Cheese on toast cheese and
					biscuits.
				</p>
				<p>
					Cheesy grin the big cheese who moved my cheese. Parmesan pecorino
					rubber cheese st. agur blue cheese cream cheese cheddar ricotta when
					the cheese comes out everybody's happy. Cheddar red leicester cheese
					slices port-salut roquefort red leicester feta fromage frais.
					Jarlsberg halloumi pecorino fromage frais danish fontina mozzarella
					cheese and wine.
				</p>
				<h2>Actions</h2>
				<span
					className="btn"
					onClick={() => {
						this.props.history.push('/videos');
					}}
				>
					Upload a Video
				</span>
			</section>
		);
	}
}
export default Introduction;
