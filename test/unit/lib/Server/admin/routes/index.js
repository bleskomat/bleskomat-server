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

		it('GET /status', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/status`,
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 200);
				assert.deepStrictEqual(body, { status: 'OK' });
			});
		});

		it('GET /u', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/u`,
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 400);
				assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Missing secret' });
			});
		});

		it('GET /admin', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin`,
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 302);
				assert.strictEqual(body, 'Found. Redirecting to /admin/setup');
			});
		});
	});

	describe('enabled with password', function() {

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

		it('GET /status', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/status`,
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 200);
				assert.deepStrictEqual(body, { status: 'OK' });
			});
		});

		it('GET /u', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/u`,
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 400);
				assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Missing secret' });
			});
		});

		it('GET /admin', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin`,
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 302);
				assert.strictEqual(body, 'Found. Redirecting to /admin/login');
			});
		});
	});
});
