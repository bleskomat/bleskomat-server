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
const scrypt = require('@bleskomat/scrypt');

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
			config.admin.password = '$scrypt$1$6$ajRPedLuznRgJNBrLrZAoShksAA=$2sfIQl3MRJnbbVDnWPDqGpTBlW0SFcUdebmr+f08rrs=';
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
