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
const { expect } = require('chai');
const { generateApiKey } = require('lnurl');

describe('admin', function() {

	let config, server;
	before(function() {
		config = this.helpers.prepareConfig();
		config.admin.web = true;
		config.admin.password = '$2b$11$BHVCR4LkawC1m37d4MHiEelGqSgEW9ptQvJwYWEXNaSfDap1jt/vy';// test
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
			'/admin/overview',
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
				expect(response.statusCode).to.equal(200);
				const $ = cheerio.load(body);
				expect($('h1').text()).to.contain('Overview');
				expect($('.box.lnurls')).to.have.length(1);
				expect($('.box.apiKeys')).to.have.length(1);
				expect($('.box.apiKeys table tbody tr')).to.have.length(config.lnurl.auth.apiKeys.length);
				expect($('.box.apiKeys table tbody tr:nth-child(1) td:first-child').text().trim()).to.contain(config.lnurl.auth.apiKeys[0].id);
			});
		});
	});
});
