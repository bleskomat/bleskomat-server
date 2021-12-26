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
				expect(response.statusCode).to.equal(302);
				expect(body).to.equal('Found. Redirecting to /admin/setup');
			});
		});

		it('POST /admin/login', function() {
			return this.helpers.request('post', {
				url: `${config.lnurl.url}/admin/login`,
				form: { password: '' },
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(302);
				expect(body).to.equal('Found. Redirecting to /admin/setup');
			});
		});
	});

	describe('enabled with password', function() {

		const validFormData = {
			password: 'test',
		};

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

		it('GET /admin/login', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin/login`,
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(200);
				const $ = cheerio.load(body);
				expect($('h1').text()).to.contain('Login');
				expect($('form input[name=password]')).to.have.length(1);
			});
		});

		describe('POST /admin/login', function() {

			const validFormData = {
				password: 'test',
				verifyPassword: 'test',
			};

			_.each({
				password: 'Password',
			}, (label, key) => {
				it(`missing ${label}`, function() {
					return this.helpers.request('post', {
						url: `${config.lnurl.url}/admin/login`,
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
					url: `${config.lnurl.url}/admin/login`,
					form: validFormData,
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(302);
					expect(body).to.equal('Found. Redirecting to /admin');
					expect(response.headers['set-cookie']).to.not.be.undefined;
					const cookie = response.headers['set-cookie'][0];
					return this.helpers.request('get', {
						url: `${config.lnurl.url}/admin/overview`,
						headers: { cookie },
					}).then(result2 => {
						const response2 = result2.response;
						const body2 = result2.body;
						expect(response2.statusCode).to.equal(200);
						const $ = cheerio.load(body2);
						expect($('h1').text()).to.contain('Overview');
						expect($('.box.lnurls')).to.have.length(1);
					});
				});
			});
		});
	});
});
