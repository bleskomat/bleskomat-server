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

		it('GET /admin/logout', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin/logout`,
				headers: { cookie },
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(302);
				expect(body).to.equal('Found. Redirecting to /admin');
				return this.helpers.request('get', {
					url: `${config.lnurl.url}/admin/overview`,
					headers: { cookie },
				}).then(result2 => {
					const response2 = result2.response;
					const body2 = result2.body;
					expect(response2.statusCode).to.equal(302);
					expect(body2).to.equal('Found. Redirecting to /admin/login');
				});
			});
		});
	});
});
