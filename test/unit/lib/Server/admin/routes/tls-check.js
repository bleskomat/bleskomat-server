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
const assert = require('assert');

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

	let httpsServer;
	before(function() {
		return this.helpers.createHttpsServer().then(result => {
			httpsServer = result;
		});
	});

	after(function() {
		return httpsServer.close();
	});

	after(function() {
		if (server) return server.close({ force: true }).then(() => {
			server = null;
		});
	});

	describe('not logged-in', function() {
		_.each([
			'/admin/tls-check',
		], uri => {
			it(`GET ${uri}`, function() {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}${uri}`,
				}).then(result => {
					const { response, body } = result;
					assert.strictEqual(response.statusCode, 302);
					assert.strictEqual(body, 'Found. Redirecting to /admin/login');
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
				assert.ok(cookie);
			});
		});

		describe('GET /admin/tls-check', function() {

			it('missing hostname', function() {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}/admin/tls-check`,
					headers: { cookie },
					qs: {},
				}).then(result => {
					const { response, body } = result;
					assert.strictEqual(response.statusCode, 400);
					assert.deepStrictEqual(body, { status: 400, error: 'Missing "hostname"' });
				});
			});

			it('invalid hostname', function() {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}/admin/tls-check`,
					headers: { cookie },
					qs: { hostname: '\/"invalid-hostname' },
				}).then(result => {
					const { response, body } = result;
					assert.strictEqual(response.statusCode, 400);
					assert.deepStrictEqual(body, { status: 400, error: 'Unable to parse hostname' });
				});
			});

			it('valid hostname, service does not exist', function() {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}/admin/tls-check`,
					headers: { cookie },
					qs: { hostname: '127.0.0.2:3001' },
				}).then(result => {
					const { response, body } = result;
					assert.strictEqual(response.statusCode, 400);
					assert.deepStrictEqual(body, { status: 400, error: 'Connection failure' });
				});
			});

			it('valid hostname, service exists', function() {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}/admin/tls-check`,
					headers: { cookie },
					qs: { hostname: httpsServer.hostname },
				}).then(result => {
					const { response, body } = result;
					assert.strictEqual(response.statusCode, 200);
					assert.strictEqual(typeof body, 'object');
					assert.strictEqual(body.authorized, false);
					assert.strictEqual(typeof body.fingerprint, 'string');
					assert.strictEqual(typeof body.fingerprint256, 'string');
					assert.strictEqual(typeof body.pem, 'string');
				});
			});
		});
	});
});
