/*
	Copyright (C) 2020 Samotari (Charles Hill, Carlos Garcia Ortiz)

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const _ = require('underscore');
const Form = require('form');
const { HttpError } = require('lnurl/lib');
const MemoryStore = require('lnurl/lib/stores/memory');

module.exports = function(app) {

	const { config, debug, lib, lnurlServer, middleware, version } = app.custom;
	const { httpErrorCodes } = lib;

	app.use(['/admin*'],
		function(req, res, next) {
			// Redirect to setup page if admin password is not set.
			if (!_.contains([req.url, req.baseUrl], '/admin/setup') && !config.admin.password) {
				return res.redirect('/admin/setup');
			}
			next();
		},
		middleware.session,
		function(req, res, next) {
			// Redirect to login page if admin password set and client is not authenticated.
			if (!_.contains([req.url, req.baseUrl], '/admin/login') && config.admin.password) {
				return middleware.redirectUnauthenticated('/admin/login')(req, res, next);
			}
			next();
		},
		function(req, res, next) {
			// Define a custom render which provides layout, template, nav, and version to all views.
			// It will also serialize a form instance if one was provided.
			const render = res.render.bind(res);
			res.render = function(filePath, context, options) {
				context = _.defaults(context || {}, {
					authenticated: req.isAuthenticated(),
					layout: 'main',
					nav: {
						items: [
							{
								name: 'overview',
								href: '/admin/overview',
								label: 'Overview',
							},
							{
								name: 'settings',
								href: '/admin/settings',
								label: 'Settings',
							},
							{
								name: 'help',
								href: '/admin/help',
								label: 'Help',
							},
							{
								name: 'logout',
								href: '/admin/logout',
								label: 'Logout',
							},
						],
					},
					template: filePath,
					version,
					showMemoryWarning: lnurlServer.store instanceof MemoryStore,
				});
				if (context.nav && context.nav.items) {
					context.nav.items = _.map(context.nav.items, item => {
						item.active = req.url.substr(0, item.href.length) === item.href;
						return item;
					});
				}
				if (context.form instanceof Form) {
					context.form = context.form.serialize();
				}
				return render(filePath, context, options);
			};
			next();
		},
	);

	app.get(['/', '/admin'],
		middleware.redirect('/admin/overview')
	);

	require('./api-keys')(app);
	require('./help')(app);
	require('./login')(app);
	require('./logout')(app);
	require('./overview')(app);
	require('./settings')(app);
	require('./setup')(app);
	require('./tls-check')(app);

	// Catch-all, 404 Not Found:
	app.use('*', function(req, res, next) {
		if (req.url.substr(0, '/admin'.length) === '/admin') {
			return next(new HttpError('The page you requested was not found.', 404));
		}
		// Not an admin route. Let the lnurl-node module server instance handle it.
		next();
	});

	// Handle errors:
	app.use(function(error, req, res, next) {
		if (req.url.substr(0, '/admin'.length) === '/admin') {
			if (!(error instanceof HttpError)) {
				debug.error(error);
				error = new HttpError('Unexpected error', 500);
			}
			const { message, status } = error;
			const title = httpErrorCodes[status];
			return res.status(status).render('message', {
				title,
				message,
			});
		}
		// Not an admin route. Let the lnurl-node module server instance handle it.
		next(error);
	});
};
