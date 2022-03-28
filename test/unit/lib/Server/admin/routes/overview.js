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
const { generateApiKey } = require('lnurl-offline');

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

		it('GET /admin/overview', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin/overview`,
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 302);
				assert.strictEqual(body, 'Found. Redirecting to /admin/login');
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

		before(function() {
			const options = {
				encoding: 'hex',
				numBytes: { id: 10, key: 32 },
			};
			config.lnurl.auth.apiKeys.push(generateApiKey(options));
			config.lnurl.auth.apiKeys.push(generateApiKey(options));
			return server.app.custom.lib.env.save(config);
		});

		it('GET /admin/overview', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin/overview`,
				headers: { cookie },
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 200);
				const $ = cheerio.load(body);
				assert.match($('h1').text(), /Overview/);
				assert.strictEqual($('.box.lnurls').length, 1);
				assert.strictEqual($('.box.apiKeys').length, 1);
				assert.strictEqual($('.box.apiKeys table tbody tr').length, config.lnurl.auth.apiKeys.length);
				assert.match($('.box.apiKeys table tbody tr:nth-child(1) td:first-child').text().trim(), new RegExp(config.lnurl.auth.apiKeys[0].id));
			});
		});
	});
});
