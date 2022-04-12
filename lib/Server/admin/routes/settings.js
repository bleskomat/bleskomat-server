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

const { checkBackend, createForm } = require('lightning-backends');
const coinRates = require('coin-rates');
const Form = require('@bleskomat/form');
const { HttpError } = require('lnurl/lib');
const scrypt = require('@bleskomat/scrypt');
const { ValidationError } = Form;

module.exports = function(app) {

	const { config, lib, lnurlServer, middleware } = app.custom;
	const { env } = lib;

	const subpages = {
		general: {
			form: new Form({
				id: 'form-settings-general',
				method: 'post',
				submit: 'Save',
				title: 'General Settings',
				instructions: 'Use the form below to change general settings.',
				groups: [
					{
						name: 'general',
						inputs: [
							{
								name: 'url',
								type: 'text',
								label: 'Server Base URL',
								placeholder: 'http://localhost:3000',
								description: 'The URL at which your server is reachable via a browser',
								required: true,
							},
							{
								name: 'defaultExchangeRatesProvider',
								label: 'Exchange Rates Provider',
								type: 'select',
								options: coinRates.providers.map(provider => {
									const { label, name } = provider;
									return { key: name, label };
								}),
								required: true,
							},
						],
					},
				],
			}),
			template: 'settings',
			title: 'General Settings',
			uri: '/admin/settings/general',
			values: function() {
				return {
					url: config.lnurl.url,
					defaultExchangeRatesProvider: config.coinRates.defaults.provider,
				};
			},
			save: function(values) {
				lnurlServer.options.url = config.lnurl.url = values.url;
				config.coinRates.defaults.provider = values.defaultExchangeRatesProvider;
				return env.save(config);
			},
		},
		login: {
			form: new Form({
				id: 'form-settings-login',
				method: 'post',
				submit: 'Save',
				title: 'Login Credentials',
				instructions: 'Use the form below to change the admin login password.',
				groups: [
					{
						name: 'login',
						inputs: [
							{
								name: 'currentPassword',
								label: 'Current Password',
								type: 'password',
								required: true,
								validate: function(value) {
									if (value) {
										return scrypt.compare(value, config.admin.password).then(correct => {
											if (!correct) {
												throw new ValidationError('"Current Password" was incorrect');
											}
										});
									}
								},
							},
							{
								name: 'newPassword',
								label: 'New Password',
								type: 'password',
								required: true,
							},
							{
								name: 'verifyNewPassword',
								label: 'Verify New Password',
								type: 'password',
								required: true,
								validate: function(value, data) {
									if (value && value !== data.newPassword) {
										throw new ValidationError('"Verify New Password" must match "New Password"');
									}
								},
							},
						],
					},
				],
			}),
			template: 'settings',
			title: 'Login Credentials',
			uri: '/admin/settings/login',
			values: function() {
				return {};
			},
			save: function(values) {
				const { keylen, saltBytes, options } = config.admin.scrypt;
				const salt = scrypt.generateSalt(saltBytes);
				const { newPassword } = values;
				return scrypt.hash(newPassword, salt, keylen, options).then(hash => {
					config.admin.password = hash;
					return env.save(config);
				});
			},
		},
		lightning: {
			form: createForm({
				id: 'form-settings-lightning',
				method: 'post',
				submit: 'Save',
				title: 'Lightning Configuration',
			}, {
				exclude: ['dummy'],
				tlsCheckUri: '/admin/tls-check',
			}),
			template: 'settings',
			title: 'Lightning Configuration',
			uri: '/admin/settings/lightning',
			values: function() {
				const { backend } = config.lnurl.lightning;
				let values = {};
				Object.entries(config.lnurl.lightning.config).forEach(([key, value], index) => {
					values[`${backend}[${key}]`] = value;
				});
				values.backend = backend;
				switch (backend) {
					case 'lnd':
						values['lnd[cert]'] = values['lnd[cert]'] && values['lnd[cert]'].data || '';
						values['lnd[macaroon]'] = values['lnd[cert]'] && values['lnd[macaroon]'].data || '';
						break;
				}
				return values;
			},
			save: function(values) {
				config.lnurl.lightning.backend = values.backend;
				config.lnurl.lightning.config = createForm.valuesToBackendConfig(values);
				config.lnurl.lightning.config.torSocksProxy = config.torSocksProxy;
				lnurlServer.ln = lnurlServer.prepareLightningBackend(config.lnurl.lightning);
				return env.save(config);
			},
		},
	};

	const prepareSubNav = function(activeUri) {
		return Object.values(subpages).map(subpage => {
			const { title, uri } = subpage;
			return {
				active: uri === activeUri,
				label: title,
				href: uri,
			};
		});
	};

	app.get('/admin/settings', middleware.redirect('/admin/settings/general'));

	Object.values(subpages).forEach(subpage => {

		const { form, save, template, title, uri, values } = subpage;

		app.get(uri,
			function(req, res, next) {
				res.render(template, {
					form: form.serialize({
						values: typeof values === 'function' ? values() : values,
					}),
					subnav: prepareSubNav(uri),
					title,
				});
			}
		);

		app.post(uri,
			middleware.bodyParser,
			function(req, res, next) {
				return form.validate(req.body).then(newValues => {
					return save(newValues).then(() => {
						return res.render(template, {
							form: form.serialize({
								extend: {
									success: 'Settings were saved successfully.',
								},
								values: typeof values === 'function' ? values() : values,
							}),
							subnav: prepareSubNav(uri),
							title,
						});
					});
				}).catch(error => {
					if (error instanceof ValidationError || error instanceof createForm.ValidationError) {
						error = new HttpError(error.message, 400);
					}
					if (error instanceof HttpError) {
						return res.status(error.status).render(template, {
							form: form.serialize({
								extend: { errors: [ error.message ] },
								values: req.body,
							}),
							subnav: prepareSubNav(uri),
							title,
						});
					}
					next(error);
				});
			}
		);
	});
};
