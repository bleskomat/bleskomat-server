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

	const { config, middleware } = app.custom;

	const form = new Form({
		method: 'post',
		action: '/admin/login',
		submit: 'Login',
		instructions: 'Use the form below to authenticate as an administrator.',
		helpHtml: 'Need some help? Join us in the official <a href="https://t.me/bleskomat">Telegram group</a> or <a href="https://github.com/samotari/bleskomat-server/issues">open an issue</a> in the project repository.',
		groups: [
			{
				name: 'login',
				inputs: [
					{
						name: 'password',
						label: 'Password',
						type: 'password',
						autofocus: true,
						required: true,
					},
				],
			},
		],
	});

	app.use('/admin/login', middleware.redirectAuthenticated('/admin'));

	app.get('/admin/login',
		function(req, res, next) {
			res.render('form', {
				form,
				title: 'Login',
			});
		}
	);

	app.post('/admin/login',
		middleware.bodyParser,
		function(req, res, next) {
			return form.validate(req.body).then(() => {
				const { password } = req.body;
				return bcrypt.compare(password, config.admin.password).then(correct => {
					if (!correct) {
						throw new ValidationError('Password was incorrect');
					}
					// Correct password provided. Log them in and send to admin overview page.
					return req.login().then(() => {
						return res.redirect('/admin');
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
						}),
						title: 'Login',
					});
				}
				next(error);
			});
		}
	);
};