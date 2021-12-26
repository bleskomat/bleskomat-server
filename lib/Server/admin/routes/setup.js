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

const bcrypt = require('bcrypt');
const Form = require('form');
const { HttpError } = require('lnurl/lib');
const { ValidationError } = Form;

module.exports = function(app) {

	const { config, lib, middleware } = app.custom;
	const { env } = lib;

	const title = 'Admin Interface Setup';

	const form = new Form({
		method: 'post',
		action: '/admin/setup',
		submit: 'Save Configuration',
		instructions: 'Use the form below to configure the bleskomat-server admin interface.',
		helpHtml: 'Need some help? Join us in the official <a href="https://t.me/bleskomat">Telegram group</a> or <a href="https://github.com/samotari/bleskomat-server/issues">open an issue</a> in the project repository.',
		groups: [
			{
				name: 'login',
				title: 'Login Credentials',
				instructions: 'Set an administrator password. You will use it to login once the server is configured.',
				inputs: [
					{
						name: 'password',
						label: 'Password',
						type: 'password',
						autofocus: true,
						required: true,
					},
					{
						name: 'verifyPassword',
						label: 'Verify Password',
						type: 'password',
						required: true,
						validate: function(value, data) {
							if (value && value !== data.password) {
								throw new ValidationError('"Verify Password" must match "Password"');
							}
						},
					},
				],
			},
		],
	});

	app.use('/admin/setup', function(req, res, next) {
		if (config.admin.password) {
			// Admin password already set, redirect to the main admin page.
			return res.redirect('/admin');
		}
		next();
	});

	app.get('/admin/setup',
		function(req, res, next) {
			res.render('form', {
				form,
				title,
			});
		}
	);

	app.post('/admin/setup',
		middleware.bodyParser,
		function(req, res, next) {
			return form.validate(req.body).then(() => {
				const { password } = req.body;
				return bcrypt.hash(password, config.admin.bcrypt.saltRounds).then(hash => {
					config.admin.password = hash;
					return env.save(config).then(() => {
						return req.login().then(() => {
							return res.redirect('/admin');
						});
					});
				});
			}).catch(error => {
				if (error instanceof ValidationError) {
					error = new HttpError(error.message, 400);
				}
				if (error instanceof HttpError) {
					return res.status(error.status).render('form', {
						form: form.serialize({
							extend: { errors: [ error.message ] },
							values: req.body,
						}),
						title,
					});
				}
				next(error);
			});
		}
	);
};
