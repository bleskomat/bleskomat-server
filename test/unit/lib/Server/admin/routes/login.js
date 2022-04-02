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

const assert = require('assert');
const cheerio = require('cheerio');

describe('admin', function() {

	describe('enabled without password', function() {

		let config, server;
		before(function() {
			config = this.helpers.prepareConfig();
			config.admin.web = true;
			config.admin.password = '';
			return this.helpers.createServer(config).then(result => {
				server = result;
			});
		});

		after(function() {
			if (server) return server.close({ force: true }).then(() => {
				server = null;
			});
		});

		it('GET /admin/login', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin/login`,
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 302);
				assert.strictEqual(body, 'Found. Redirecting to /admin/setup');
			});
		});

		it('POST /admin/login', function() {
			return this.helpers.request('post', {
				url: `${config.lnurl.url}/admin/login`,
				form: { password: '' },
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 302);
				assert.strictEqual(body, 'Found. Redirecting to /admin/setup');
			});
		});
	});

	describe('enabled with password', function() {

		[
			{
				description: 'legacy format = "salt;keylen;cost;derivedKey"',
				hash: '62356789b3e8cb63ffd548335c70b909ca608063;32;4096;219ae2fccb20f3dec76efd63055f207e501a024b5edd4b9c555fe15d4c90f4bc',
			},
			{
				description: 'legacy format = "salt;cost;derivedKey"',
				hash: '62356789b3e8cb63ffd548335c70b909ca608063;4096;219ae2fccb20f3dec76efd63055f207e501a024b5edd4b9c555fe15d4c90f4bc',
			},
			{
				description: '@bleskomat/scrypt serialization format',
				hash: '$scrypt$1$6$ajRPedLuznRgJNBrLrZAoShksAA=$2sfIQl3MRJnbbVDnWPDqGpTBlW0SFcUdebmr+f08rrs=',
			},
		].forEach(group => {

			const { description, hash } = group;

			describe(description, function() {

				let config, server;
				before(function() {
					config = this.helpers.prepareConfig();
					config.admin.web = true;
					config.admin.password = hash;
					return this.helpers.createServer(config).then(result => {
						server = result;
					});
				});

				after(function() {
					if (server) return server.close({ force: true }).then(() => {
						server = null;
					});
				});

				it('GET /admin/login', function() {
					return this.helpers.request('get', {
						url: `${config.lnurl.url}/admin/login`,
					}).then(result => {
						const { response, body } = result;
						assert.strictEqual(response.statusCode, 200);
						const $ = cheerio.load(body);
						assert.match($('h1').text(), /Login/);
						assert.strictEqual($('form input[name=password]').length, 1);
					});
				});

				describe('POST /admin/login', function() {

					const validFormData = {
						password: 'test',
					};

					Object.entries({
						password: 'Password',
					}).forEach(([key, label], index) => {
						it(`missing ${label}`, function() {
							let form = JSON.parse(JSON.stringify(validFormData));
							delete form[key];
							return this.helpers.request('post', {
								url: `${config.lnurl.url}/admin/login`,
								form,
							}).then(result => {
								const { response, body } = result;
								assert.strictEqual(response.statusCode, 400);
								const $ = cheerio.load(body);
								assert.match($('.form-errors').text(), new RegExp(`"${label}" is required`));
							});
						});
					});

					it('invalid password', function() {
						return this.helpers.request('post', {
							url: `${config.lnurl.url}/admin/login`,
							form: { password: 'incorrect' },
						}).then(result => {
							const { body, response } = result;
							assert.strictEqual(response.statusCode, 400);
							const $ = cheerio.load(body);
							assert.match($('.form-errors').text(), /Password was incorrect/);
						});
					});

					it('valid form data', function() {
						return this.helpers.request('post', {
							url: `${config.lnurl.url}/admin/login`,
							form: validFormData,
						}).then(loginResult => {
							assert.strictEqual(loginResult.response.statusCode, 302);
							assert.strictEqual(loginResult.body, 'Found. Redirecting to /admin');
							assert.ok(loginResult.response.headers['set-cookie']);
							const cookie = loginResult.response.headers['set-cookie'][0];
							return this.helpers.request('get', {
								url: `${config.lnurl.url}/admin/overview`,
								headers: { cookie },
							}).then(overviewResult => {
								assert.strictEqual(overviewResult.response.statusCode, 200);
								const $ = cheerio.load(overviewResult.body);
								assert.match($('h1').text(), /Overview/);
								assert.strictEqual($('.box.lnurls').length, 1);
								return this.helpers.readEnv(config.env.filePath).then(env => {
									const prefix = '$scrypt$';
									assert.strictEqual(env.BLESKOMAT_SERVER_ADMIN_PASSWORD.substr(0, prefix.length), prefix);
								});
							});
						});
					});
				});
			});
		});
	});
});
