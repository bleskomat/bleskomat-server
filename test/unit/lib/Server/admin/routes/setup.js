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

describe('admin', function() {

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

	it('GET /admin/setup', function() {
		return this.helpers.request('get', {
			url: `${config.lnurl.url}/admin/setup`,
		}).then(result => {
			const { response, body } = result;
			expect(response.statusCode).to.equal(200);
			const $ = cheerio.load(body);
			expect($('h1').text()).to.contain('Admin Interface Setup');
			expect($('.form-group--login .form-group-instructions').text()).to.contain('Set an administrator password');
			expect($('form input[name=password]')).to.have.length(1);
			expect($('form input[name=verifyPassword]')).to.have.length(1);
		});
	});

	describe('POST /admin/setup', function() {

		const validFormData = {
			password: 'test',
			verifyPassword: 'test',
		};

		_.each({
			password: 'Password',
			verifyPassword: 'Verify Password',
		}, (label, key) => {
			it(`missing ${label}`, function() {
				return this.helpers.request('post', {
					url: `${config.lnurl.url}/admin/setup`,
					form: _.omit(validFormData, key),
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(400);
					const $ = cheerio.load(body);
					expect($('.form-errors').text()).to.contain(`"${label}" is required`);
				});
			});
		});

		it('passwords do not match', function() {
			return this.helpers.request('post', {
				url: `${config.lnurl.url}/admin/setup`,
				form: {
					password: validFormData.password,
					verifyPassword: `x${validFormData.password}`,
				},
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(400);
				const $ = cheerio.load(body);
				expect($('.form-errors').text()).to.contain('"Verify Password" must match "Password"');
			});
		});

		it('valid form data', function() {
			return this.helpers.request('post', {
				url: `${config.lnurl.url}/admin/setup`,
				form: validFormData,
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(302);
				expect(body).to.equal('Found. Redirecting to /admin');
				return this.helpers.readEnv(config.env.filePath).then(env => {
					const { scrypt } = server.app.custom.lib;
					return scrypt.compare(validFormData.password, env.BLESKOMAT_SERVER_ADMIN_PASSWORD).then(correct => {
						expect(correct).to.equal(true);
					});
				});
			});
		});
	});
});
