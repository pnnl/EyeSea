export const generateEnterHandler = function(callback) {
	return function(event) {
		if (event.keyCode === 13) {
			callback(event);
		}
	};
};

export const generateMenuHandler = function(callback) {
	return function(event) {
		var open = event.target.parentNode.classList.contains('open'),
			next = event.target.nextElementSibling;

		if (
			event.keyCode === 13 ||
			(event.keyCode === 27 && open) ||
			(event.keyCode === 38 && open)
		) {
			callback(event);
		} else if (event.keyCode === 40 && open) {
			next.firstElementChild.focus();
		} else if (event.keyCode === 40) {
			callback(event);
			// Not terribly React-y.
			setTimeout(function() {
				next.firstElementChild.focus();
			}, 0);
		}
	};
};

export const generateMenuItemHandler = function(callback) {
	return function(event) {
		var open = event.target.parentNode.parentNode.classList.contains('open');

		if (event.keyCode === 13) {
			callback(event);
		} else if (event.keyCode === 38) {
			if (event.target.previousElementSibling) {
				event.target.previousElementSibling.focus();
			} else {
				event.target.parentNode.previousElementSibling.focus();
			}
		} else if (event.keyCode === 40) {
			event.target.nextElementSibling &&
				event.target.nextElementSibling.focus();
		} else if (event.keyCode === 27 && open) {
			event.target.parentNode.previousElementSibling.click();
		}
	};
};
