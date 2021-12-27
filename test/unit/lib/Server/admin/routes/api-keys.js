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
const { expect } = require('chai');
const { generateApiKey } = require('lnurl');

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
			'/admin/api-key/add',
			'/admin/api-key/xxx/delete',
			'/admin/api-key/xxx/download-config',
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

		it('GET /admin/api-keys/add', function() {
			const apiKeysBefore = JSON.parse(JSON.stringify(config.lnurl.auth.apiKeys));
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin/api-keys/add`,
				headers: { cookie },
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(302);
				expect(body).to.equal('Found. Redirecting to /admin/overview');
				return this.helpers.readEnv(config.env.filePath).then(env => {
					const apiKeys = JSON.parse(env.BLESKOMAT_SERVER_AUTH_API_KEYS);
					expect(apiKeys).to.have.length(config.lnurl.auth.apiKeys.length);
					expect(apiKeys).to.have.length(apiKeysBefore.length + 1);
					_.each(apiKeys, apiKey => {
						expect(apiKey.encoding).to.equal('hex');
						expect(apiKey).to.have.property('id');
						expect(apiKey).to.have.property('key');
					});
				});
			});
		});

		it('GET /admin/api-keys/:id/delete', function() {
			const apiKey = generateApiKey({
				encoding: 'hex',
				numBytes: { id: 10, key: 32 },
			});
			const apiKey2 = generateApiKey({
				encoding: 'hex',
				numBytes: { id: 10, key: 32 },
			});
			config.lnurl.auth.apiKeys.push(apiKey);
			config.lnurl.auth.apiKeys.push(apiKey2);
			return server.app.custom.lib.env.save(config).then(() => {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}/admin/api-keys/${apiKey.id}/delete`,
					headers: { cookie },
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(302);
					expect(body).to.equal('Found. Redirecting to /admin/overview');
					return this.helpers.readEnv(config.env.filePath).then(env => {
						const apiKeys = JSON.parse(env.BLESKOMAT_SERVER_AUTH_API_KEYS);
						const apiKeyFromEnv = _.findWhere(apiKeys, { id: apiKey.id });
						const apiKeyFromEnv2 = _.findWhere(apiKeys, { id: apiKey2.id });
						expect(apiKeyFromEnv).to.be.undefined;
						expect(apiKeyFromEnv2).to.not.be.undefined;
					});
				});
			});
		});

		it('GET /admin/api-keys/:id/download-config', function() {
			const apiKey = generateApiKey({
				encoding: 'hex',
				numBytes: { id: 10, key: 32 },
			});
			config.lnurl.auth.apiKeys.push(apiKey);
			return server.app.custom.lib.env.save(config).then(() => {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}/admin/api-keys/${apiKey.id}/download-config`,
					headers: { cookie },
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(200);
					expect(response.headers['content-disposition']).to.equal('attachment; filename=bleskomat.conf');
					expect(response.headers['content-type']).to.equal('text/plain');
					const values = _.chain(body.split('\n')).map(line => {
						if (line) {
							const parts = line.split('=');
							const key = parts[0];
							if (key) {
								const value = parts[1];
								return [ key, value ];
							}
						}
					}).compact().object().value();
					expect(values['apiKey.id']).to.equal(apiKey.id);
					expect(values['apiKey.key']).to.equal(apiKey.key);
					expect(values['apiKey.encoding']).to.equal(apiKey.encoding);
					expect(values['callbackUrl']).to.equal(server.getCallbackUrl());
				});
			});
		});
	});
});
