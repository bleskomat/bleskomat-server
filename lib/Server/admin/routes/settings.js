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
const bcrypt = require('bcrypt');
const coinRates = require('coin-rates');
const Form = require('form');
const { HttpError } = require('lnurl/lib');
const { ValidationError } = Form;

module.exports = function(app) {

	const { config, lib, lnurlServer, middleware } = app.custom;
	const { checkLightningConfiguration, env, lightningBackends } = lib;

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
								options: _.map(coinRates.providers, provider => {
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
										return bcrypt.compare(value, config.admin.password).then(correct => {
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
				const { saltRounds } = config.admin.bcrypt;
				const { newPassword } = values;
				return bcrypt.hash(newPassword, saltRounds).then(hash => {
					config.admin.password = hash;
					return env.save(config);
				});
			},
		},
		lightning: {
			form: new Form({
				id: 'form-settings-lightning',
				method: 'post',
				submit: 'Save',
				title: 'Lightning Configuration',
				groups: [
					{
						name: 'backend',
						instructions: 'To test new Lightning credentials, a payment will be attempted using an invoice with a randomly generated node pubkey in the amount of 1 satoshi.',
						inputs: [{
							name: 'backend',
							label: 'Lightning Backend Type',
							type: 'select',
							options: (function() {
								return [{ key: '', label: '' }].concat(_.map(lightningBackends, function(lightningBackend) {
									const { name, label } = lightningBackend;
									return {
										key: name,
										label: label || name,
									};
								}));
							})(),
							default: '',
							required: true,
							validate: function(value) {
								if (!_.findWhere(lightningBackends, { name: value })) {
									throw new ValidationError('Unknown backend: "' + value + '"');
								}
							},
						}],
					},
				].concat(
					_.map(lightningBackends, lightningBackend => {
						const { name } = lightningBackend;
						let { inputs } = lightningBackend;
						inputs = _.map(inputs, input => {
							return _.extend({}, input, {
								name: `${name}[${input.name}]`,
								required: input.required !== true ? false : function(data) {
									return _.isUndefined(data) || data.backend === name;
								},
							});
						});
						return { name, inputs };
					})
				),
				validate: function(data) {
					const config = formValuesToLightningConfig(data);
					const { backend } = data;
					const lightning = { backend, config };
					return checkLightningConfiguration(lightning).then(checksPassed => {
						if (!checksPassed) {
							throw new HttpError('Failed test of Lightning configurations. Are you sure the credentials provided are correct?', 400);
						}
					});
				},
				process: function(values) {
					const { backend } = values;
					const config = formValuesToLightningConfig(values);
					values.lightning = { backend, config };
					return values;
				},
			}),
			template: 'settings',
			title: 'Lightning Configuration',
			uri: '/admin/settings/lightning',
			values: function() {
				const { backend } = config.lnurl.lightning;
				let values = _.chain(config.lnurl.lightning.config).map((value, key) => {
					return [`${backend}[${key}]`, value];
				}).compact().object().value();
				values.backend = backend;
				switch (backend) {
					case 'lnd':
						values['lnd[cert]'] = values['lnd[cert]'].data;
						values['lnd[macaroon]'] = values['lnd[macaroon]'].data;
						break;
				}
				return values;
			},
			save: function(values) {
				config.lnurl.lightning.backend = values.backend;
				config.lnurl.lightning.config = formValuesToLightningConfig(values);
				lnurlServer.ln = lnurlServer.prepareLightningBackend(config.lnurl.lightning);
				return env.save(config);
			},
		},
	};

	const formValuesToLightningConfig = function(values) {
		const { backend } = values;
		let config = _.chain(values).map((value, key) => {
			const match = key.match(/([a-z]+)\[([^\[\]]+)\]/i);
			if (!match || !match[1] || !match[2]) return null;
			if (match[1] !== backend) return null;
			return [ match[2], value ];
		}).compact().object().value();
		switch (backend) {
			case 'lnd':
				config.cert = { data: config.cert };
				config.macaroon = { data: config.macaroon };
				break;
		}
		return config;
	};

	const prepareSubNav = function(activeUri) {
		return _.map(subpages, subpage => {
			const { title, uri } = subpage;
			return {
				active: uri === activeUri,
				label: title,
				href: uri,
			};
		});
	};

	app.get('/admin/settings', middleware.redirect('/admin/settings/general'));

	_.each(subpages, subpage => {

		const { form, save, template, title, uri, values } = subpage;

		app.get(uri,
			function(req, res, next) {
				res.render(template, {
					form: form.serialize({
						values: _.isFunction(values) ? values() : values,
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
								values: _.isFunction(values) ? values() : values,
							}),
							subnav: prepareSubNav(uri),
							title,
						});
					});
				}).catch(error => {
					if (error instanceof ValidationError) {
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
