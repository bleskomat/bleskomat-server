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
const scrypt = require('../../../../../lib/Server/admin/lib/scrypt');

describe('admin', function() {

	let server;
	afterEach(function() {
		if (server) return server.close().then(() => {
			server = null;
		});
	});

	describe('config', function() {

		it('enabled without password', function() {
			let config = this.helpers.prepareConfig();
			config.admin.web = true;
			config.admin.password = '';
			config.lnurl.lightning.backend = 'coinos';
			config.lnurl.lightning.config = { jwt: 'xxx' };
			return this.helpers.createServer(config).then(result => {
				server = result;
				throw new Error('Expected an error');
			}).catch(error => {
				assert.strictEqual(error.message, 'A password is required to use the admin interface with a configured Lightning backend');
			});
		});

		it('with plaintext password', function() {
			let config = this.helpers.prepareConfig();
			const password = 'test';
			config.admin.web = true;
			config.admin.password = null;
			config.admin.passwordPlaintext = password;
			return this.helpers.createServer(config).then(result => {
				server = result;
				const hash = server.app.custom.config.admin.password;
				assert.strictEqual(typeof hash, 'string');
				assert.notStrictEqual(hash, '');
				assert.strictEqual(server.app.custom.config.admin.passwordPlaintext, null);
				return scrypt.compare(password, hash).then(correct => {
					assert.strictEqual(correct, true);
				});
			});
		});

		it('with both hashed and plaintext password', function() {
			let config = this.helpers.prepareConfig();
			const password = 'test';// matches the hashed password below
			const newPassword = 'test2';
			config.admin.web = true;
			config.admin.password = '8d2ae4b900956fc55cecd824213fc7d433d5e8ec0c554ca9c97e896f1e736157;4096;83da6e19afea72acff9526f959408b284bcdff0e7795912a13dbab3229225813';
			config.admin.passwordPlaintext = newPassword;
			return this.helpers.createServer(config).then(result => {
				server = result;
				const hash = server.app.custom.config.admin.password;
				assert.strictEqual(typeof hash, 'string');
				assert.notStrictEqual(hash, '');
				assert.strictEqual(server.app.custom.config.admin.passwordPlaintext, null);
				return scrypt.compare(password, hash).then(correct => {
					assert.strictEqual(correct, true);
					return scrypt.compare(newPassword, hash).then(correct2 => {
						assert.strictEqual(correct2, false);
					});
				});
			});
		});
	});
});
