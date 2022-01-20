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
const cheerio = require('cheerio');
const coinRates = require('coin-rates');
const { expect } = require('chai');

describe('admin', function() {

	let config, server;
	before(function() {
		config = this.helpers.prepareConfig();
		config.admin.web = true;
		config.admin.password = '2904be08aa871adedb4be91160f4d4a10cb36321;32;16;bceb4bd3444c2be5e3e544891118d5150cc2385232d1787097467aa60993cdd0';// test
		return this.helpers.createServer(config).then(result => {
			server = result;
		});
	});

	after(function() {
		if (server) return server.close({ force: true }).then(() => {
			server = null;
		});
	});

	describe('not logged-in', function() {
		_.each([
			'/admin/settings',
		], uri => {
			it(`GET ${uri}`, function() {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}${uri}`,
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(302);
					expect(body).to.equal('Found. Redirecting to /admin/login');
				});
			});
		});
	});

	describe('logged-in', function() {

		let cookie;
		before(function() {
			return this.helpers.request('post', {
				url: `${config.lnurl.url}/admin/login`,
				form: { password: 'test' },
			}).then(result => {
				const { response } = result;
				cookie = response.headers['set-cookie'][0];
				expect(cookie).to.not.be.undefined;
			});
		});

		it('GET /admin/settings', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin/settings`,
				headers: { cookie },
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(302);
				expect(body).to.equal('Found. Redirecting to /admin/settings/general');
			});
		});

		it('GET /admin/settings/general', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin/settings/general`,
				headers: { cookie },
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(200);
				const $ = cheerio.load(body);
				expect($('.form-title').text()).to.contain('General Settings');
				expect($('form input[name=url]')).to.have.length(1);
				expect($('form select[name=defaultExchangeRatesProvider]')).to.have.length(1);
				expect($('form select[name=defaultExchangeRatesProvider] option')).to.have.length(coinRates.providers.length);
			});
		});

		it('GET /admin/settings/login', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin/settings/login`,
				headers: { cookie },
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(200);
				const $ = cheerio.load(body);
				expect($('.form-title').text()).to.contain('Login Credentials');
				expect($('form input[name=currentPassword]')).to.have.length(1);
				expect($('form input[name=newPassword]')).to.have.length(1);
				expect($('form input[name=verifyNewPassword]')).to.have.length(1);
			});
		});

		it('GET /admin/settings/lightning', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin/settings/lightning`,
				headers: { cookie },
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(200);
				const $ = cheerio.load(body);
				expect($('.form-title').text()).to.contain('Lightning Configuration');
				expect($('form select[name=backend]')).to.have.length(1);
				expect($('form input[name="lnd[baseUrl]"]')).to.have.length(1);
				expect($('form textarea[name="lnd[cert]"]')).to.have.length(1);
				expect($('form textarea[name="lnd[macaroon]"]')).to.have.length(1);
			});
		});

		describe('POST /admin/settings/general', function() {

			const validFormData = {
				url: 'http://127.0.0.1:3000',
				defaultExchangeRatesProvider: 'kraken',
			};

			_.each({
				url: 'Server Base URL',
				defaultExchangeRatesProvider: 'Exchange Rates Provider',
			}, (label, key) => {
				it(`missing ${label}`, function() {
					return this.helpers.request('post', {
						url: `${config.lnurl.url}/admin/settings/general`,
						headers: { cookie },
						form: _.omit(validFormData, key),
					}).then(result => {
						const { response, body } = result;
						expect(response.statusCode).to.equal(400);
						const $ = cheerio.load(body);
						expect($('.form-errors').text()).to.contain(`"${label}" is required`);
					});
				});
			});

			it('valid form data', function() {
				return this.helpers.request('post', {
					url: `${config.lnurl.url}/admin/settings/general`,
					headers: { cookie },
					form: validFormData,
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(200);
					const $ = cheerio.load(body);
					expect($('.form-success').text()).to.contain('Settings were saved successfully.');
					return this.helpers.readEnv(config.env.filePath).then(env => {
						expect(env.BLESKOMAT_SERVER_URL).to.equal(validFormData.url);
						expect(env.BLESKOMAT_SERVER_COINRATES_DEFAULTS_PROVIDER).to.equal(validFormData.defaultExchangeRatesProvider);
					});
				});
			});
		});

		describe('POST /admin/settings/login', function() {

			const validFormData = {
				currentPassword: 'test',
				newPassword: 'test2',
				verifyNewPassword: 'test2',
			};

			_.each({
				currentPassword: 'Current Password',
			}, (label, key) => {
				it(`missing ${label}`, function() {
					return this.helpers.request('post', {
						url: `${config.lnurl.url}/admin/settings/login`,
						headers: { cookie },
						form: _.omit(validFormData, key),
					}).then(result => {
						const { response, body } = result;
						expect(response.statusCode).to.equal(400);
						const $ = cheerio.load(body);
						expect($('.form-errors').text()).to.contain(`"${label}" is required`);
					});
				});
			});

			it('incorrect current password', function() {
				return this.helpers.request('post', {
					url: `${config.lnurl.url}/admin/settings/login`,
					headers: { cookie },
					form: _.extend({}, validFormData, {
						currentPassword: 'incorrect',
					}),
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(400);
					const $ = cheerio.load(body);
					expect($('.form-errors').text()).to.contain('"Current Password" was incorrect');
				});
			});

			it('new password mis-match', function() {
				return this.helpers.request('post', {
					url: `${config.lnurl.url}/admin/settings/login`,
					headers: { cookie },
					form: _.extend({}, validFormData, {
						verifyNewPassword: `x${validFormData.newPassword}`,
					}),
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(400);
					const $ = cheerio.load(body);
					expect($('.form-errors').text()).to.contain('"Verify New Password" must match "New Password"');
				});
			});

			it('valid form data', function() {
				return this.helpers.request('post', {
					url: `${config.lnurl.url}/admin/settings/login`,
					headers: { cookie },
					form: validFormData,
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(200);
					const $ = cheerio.load(body);
					expect($('.form-success').text()).to.contain('Settings were saved successfully.');
					return this.helpers.readEnv(config.env.filePath).then(env => {
						const { scrypt } = server.app.custom.lib;
						return scrypt.compare(validFormData.newPassword, env.BLESKOMAT_SERVER_ADMIN_PASSWORD).then(correct => {
							expect(correct).to.equal(true);
						});
					});
				});
			});
		});
	});
});
