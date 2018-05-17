export function classify(value) {
	return value
		? value
				.toLowerCase()
				.replace(/\//g, '_')
				.replace(/ /g, '-')
		: '';
}
