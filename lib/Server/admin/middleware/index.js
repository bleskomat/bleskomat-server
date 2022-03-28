/*
	Copyright (C) 2020 Bleskomat s.r.o.

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

const bodyParser = require('body-parser');
const express = require('express');
const Form = require('@bleskomat/form');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const Handlebars = require('express-handlebars');

module.exports = function(app) {

	const { config } = app.custom;

	const viewsDir = path.join(__dirname, '..', 'views');

	const hbs = Handlebars.create({
		extname: '.html',
		helpers: Object.assign({}, Form.handlebars.helpers),
		partialsDir: [
			path.join(viewsDir, 'partials'),
			Form.handlebars.partialsDir,
		],
	});

	app.engine('.html', hbs.engine);
	app.set('view engine', '.html');
	app.set('views', viewsDir);
	app.enable('view cache');

	const middleware = {
		// Parse application/x-www-form-urlencoded:
		bodyParser: bodyParser.urlencoded({ extended: false }),
		session: [
			session(config.admin.session),
			function(req, res, next) {
				req.isAuthenticated = function() {
					return !!this.session.auth;
				};
				next();
			},
			function(req, res, next) {
				// Wrap session object methods with an optional promise interface.
				// This makes it much easier to work with in the routes and elsewhere.
				try {
					['destroy', 'reload', 'regenerate', 'save'].forEach(name => {
						if (req.session) {
							const fn = req.session[name].bind(req.session);
							req.session[name] = function(callback) {
								if (callback) {
									return fn(callback);
								}
								return new Promise((resolve, reject) => {
									fn(function(error) {
										if (error) return reject(error);
										resolve();
									});
								});
							};
						}
					});
					req.login = function() {
						return req.session.regenerate().then(() => {
							req.session.auth = true;
							return req.session.save();
						});
					};
					req.logout = function() {
						return req.session.regenerate();
					};
				} catch (error) {
					return next(error);
				}
				next();
			},
		],
		redirectAuthenticated: function(toUrl, options) {
			return function(req, res, next) {
				if (req.isAuthenticated()) {
					return middleware.redirect(toUrl, options)(req, res, next);
				}
				next();
			};
		},
		redirectUnauthenticated: function(toUrl, options) {
			return function(req, res, next) {
				if (!req.isAuthenticated()) {
					return middleware.redirect(toUrl, options)(req, res, next);
				}
				next();
			};
		},
		redirect: function(toUrl, options) {
			options = Object.assign({
				returnHere: false,
			}, options || {});
			return function(req, res, next) {
				if (options.returnHere) {
					let toUrlWithReturn = new URL(toUrl, config.lnurl.url);
					toUrlWithReturn.searchParams.set('returnUrl', req.url);
					return res.redirect(`${toUrlWithReturn.pathname}${toUrlWithReturn.search}`);
				}
				return res.redirect(toUrl);
			};
		},
	};

	app.use(express.static(path.join(__dirname, '..', 'web')));

	(function() {
		const dir = path.join(__dirname, '..', '..', '..', '..', 'node_modules', '@bleskomat', 'open-sans-fontface', 'fonts');
		const subdirs = fs.readdirSync(dir);
		subdirs.forEach(subdir => {
			app.use('/fonts/OpenSans', express.static(path.join(dir, subdir)));
		});
	})();

	return middleware;
};
