// Inject fetch polyfill if fetch is unsuported by the user's browser
if (!window.fetch) {
	const fetch = require('whatwg-fetch');
} // eslint-disable-line

/**
 * Represents a the base FETCH configuration settings common to most GET requests.
 * See https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch for more options.
 * @param {string} method - The HTTP method used to communicate to the API being requested.
 * @param {string} credentials - This will send the authorization credentials for the user requesting the resource.
 * @param {Object} headers - This HTTP Headers object that you want to send along with the request.
 **/
const baseOptions = {
	method: 'GET',
	credentials: 'include',
	headers: {
		'Content-Type': 'application/json',
	},
};

/**
 * This method is used to resolve the first promise that the FETCH method returns. Common things
 * that this method is used for: resolving successful/bad requests, resolving HTTP Status Codes, raising custom errors.
 * @param {Object} response - An HTTP response object. Could be undefined or null if the request was aborted for any reason.
 * @return {Object} - The Promise object for the HTTP call
 **/
function resolve(response) {
	if (response) {
		if (response.status >= 200 && response.status < 300) {
			return Promise.resolve(response);
		}
		return Promise.reject(new Error(response.statusText));
	}
	return Promise.reject(new Error('Unable to complete data request.'));
}

/**
 * This is a wrapper function around the FETCH Promise. If additional processing is needed for the HTTP response, it should be done here.
 * @param {string} url - The URL used in the method request. Use this in combination with the toQueryString method.
 * @param {Object} options - The FETCH method HTTP options.
 * @return {void} - No return value
 **/
function request(url, options) {
	return fetch(url, options)
		.then(resolve)
		.then(response => response.json());
}
export default request;

/**
 * This is a collection of shortcut methods you can use to call HTTP endpoints. By default you can supply the basic method options
 * and get basic operations for each type. This should be sufficient for most calls. If you need to supply overridden options or
 * you would like to change the base options, each convienence method has a overridden options parameter for you to use.
 *
 * There is also a convience method built into this object to do query string construction if you need it.
 **/

/**
 * This is a basic GET method call. It inherits the base options from this library and can be overridden to suit your needs.
 * @param {string} url - The URL used in the method request. Use this in combination with the toQueryString method.
 * @param {Object} [options] - Optional. Used to override the base options for the method. Any options passed in will override the defaults.
 * @return {Object} - The response object from the HTTP call. It will be in JSON format if successful.
 **/
export function get(url, options = {}) {
	return request(url, Object.assign({}, baseOptions, options));
}

var requestId = 0;
/**
 * This is a basic POST method call. It inherits the base options from this library and can be overridden to suit your needs.
 * @param {string} url - The URL used in the method request. Use this in combination with the toQueryString method.
 * @param {Object} data - Used as the body payload for the method. It will be wrapped in a JSON.stringify() call.
 * @param {Object} [options] - Optional. Used to override the base options for the method. Any options passed in will override the defaults.
 * @return {Object} - The response object from the HTTP call. It will be in JSON format if successful.
 **/
export function post(url, data, options = {}) {
	if (typeof data.requestId === 'boolean' && data.requestId) {
		requestId--;
		data.requestId = requestId;
	}
	return request(
		url,
		Object.assign(
			{},
			baseOptions,
			{ method: 'POST', body: JSON.stringify(data) },
			options
		)
	);
}

export function toQueryString(obj) {
	const parts = [];
	Object.keys(obj).forEach(p => {
		parts.push(`${encodeURIComponent(p)}=${encodeURIComponent(obj[p])}`);
	});
	return parts.length > 0 ? parts.join('&') : '';
}
