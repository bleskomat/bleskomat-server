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
const scrypt = require('../../../../../../lib/Server/admin/lib/scrypt');

describe('scrypt', function() {

	describe('compare(secret, hash)', function() {

		it('returns a promise that resolves to TRUE when secret matches the hash', function() {
			const secret = 'test';
			const hash = '62356789b3e8cb63ffd548335c70b909ca608063;32;4096;219ae2fccb20f3dec76efd63055f207e501a024b5edd4b9c555fe15d4c90f4bc';
			return scrypt.compare(secret, hash).then(correct => {
				assert.ok(correct);
			});
		});

		it('returns a promise that resolves to FALSE when secret does not match the hash', function() {
			const secret = 'does-not-match';
			const hash = '62356789b3e8cb63ffd548335c70b909ca608063;32;4096;219ae2fccb20f3dec76efd63055f207e501a024b5edd4b9c555fe15d4c90f4bc';
			return scrypt.compare(secret, hash).then(correct => {
				assert.ok(!correct);
			});
		});
	});

	describe('generateSalt(numBytes)', function() {

		it('returns a Buffer with the correct number of random bytes', function() {
			const salt20 = scrypt.generateSalt(20);
			const salt32 = scrypt.generateSalt(32);
			assert.ok(salt20 instanceof Buffer);
			assert.strictEqual(salt20.byteLength, 20);
			assert.strictEqual(salt32.byteLength, 32);
		});
	});

	describe('hash(secret, salt, keylen[, options])', function() {

		it('returns a promise that resolves with a portable hash string of the secret', function() {
			const secret = 'test';
			const salt = Buffer.from('f24b1f138915f4f98664a799de2893b8a28ee754e00830a3624686bbcdb270aa', 'hex');
			const keylen = 32;
			const options = { cost: 4096 };
			return scrypt.hash(secret, salt, keylen, options).then(hash => {
				assert.strictEqual(hash, 'f24b1f138915f4f98664a799de2893b8a28ee754e00830a3624686bbcdb270aa;4096;7c1146d46cec486c4e04b7d287997eaa52e0d19f5ec8cd1935cd913dd972b9c6');
			});
		});
	});

	describe('hashSync(secret, salt, keylen[, options])', function() {

		it('returns a portable hash string of the secret', function() {
			const secret = 'test';
			const salt = Buffer.from('f24b1f138915f4f98664a799de2893b8a28ee754e00830a3624686bbcdb270aa', 'hex');
			const keylen = 32;
			const options = { cost: 4096 };
			const hash = scrypt.hashSync(secret, salt, keylen, options);
			assert.strictEqual(hash, 'f24b1f138915f4f98664a799de2893b8a28ee754e00830a3624686bbcdb270aa;4096;7c1146d46cec486c4e04b7d287997eaa52e0d19f5ec8cd1935cd913dd972b9c6');
		});
	});
});
