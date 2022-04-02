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
const https = require('https');
const pem = require('pem');

describe('admin', function() {

	let config, server;
	before(function() {
		config = this.helpers.prepareConfig();
		config.admin.web = true;
		config.admin.password = '$scrypt$1$6$ajRPedLuznRgJNBrLrZAoShksAA=$2sfIQl3MRJnbbVDnWPDqGpTBlW0SFcUdebmr+f08rrs=';// test
		return this.helpers.createServer(config).then(result => {
			server = result;
		});
	});

	let httpsServer;
	before(function(done) {
		const host = '127.0.0.1';
		const port = 18080;
		const hostname = `${host}:${port}`;
		pem.createCertificate({
			selfSigned: true,
			days: 30,
			altNames: [ host ],
		}, (error, result) => {
			if (error) return done(error);
			const key = result.serviceKey;
			const cert = result.certificate;
			httpsServer = https.createServer({ key, cert }).listen(port, host, () => done());
			httpsServer.hostname = hostname;
		});
	});

	after(function(done) {
		if (httpsServer) return httpsServer.close(done);
		done();
	});

	after(function() {
		if (server) return server.close({ force: true }).then(() => {
			server = null;
		});
	});

	describe('not logged-in', function() {

		it('GET /admin/tls-check', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/admin/tls-check`,
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
					assert.deepStrictEqual(body, { status: 400, error: 'Invalid hostname' });
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
