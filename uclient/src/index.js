//Copyright 2018 Battelle Memorial Institute. All rights reserved.

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter, BrowserRouter } from 'react-router-dom';
import App from './app';
import store from './reduxProvider';

// Should be BrowserRouter, but that needs the server to support redirecting routes
// as there's a disconnect between the route you see in the URL and where the app
// will actually load from.
ReactDOM.render(
	<Provider store={store}>
		<HashRouter>
			<App servicePath="http://localhost:8080/" />
		</HashRouter>
	</Provider>,
	document.getElementById('app')
);
