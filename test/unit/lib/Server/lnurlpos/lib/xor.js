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

const assert = require('assert');
const xor = require('../../../../../../lib/Server/lnurlpos/lib/xor');

describe('xor', function() {

	const payloads = [
		{
			p: 'AQhnxmlzUf9K7AW4jf5K_4vPUFP538fN',
			pin: 1234,
			amount: 1,
			key: 'test-super-secret-key',
		},
		{
			p: 'AQhnxmlzUf9K7AW4Mepe_8ArcfITXgyU',
			pin: 4206,
			amount: 21,
			key: 'test-super-secret-key',
		},
		{
			p: 'AQhnxmlzUf9K7AULR4UZRd16oDOpwKn9',
			pin: 7604,
			amount: 48,
			key: 'different-secret-key',
		},
	];

	describe('decrypt(key, payload)', function() {

		it('key not buffer', function() {
			const { key, p } = payloads[0];
			assert.throws(
				() => xor.decrypt(
					key,
					Buffer.from(p, 'base64')
				),
				{ message: 'Invalid argument ("key"): Buffer expected' }
			);
		});

		it('payload not buffer', function() {
			const { key, p } = payloads[0];
			assert.throws(
				() => xor.decrypt(
					Buffer.from(key, 'utf8'),
					p
				),
				{ message: 'Invalid argument ("payload"): Buffer expected' }
			);
		});

		it('unsupported variant', function() {
			const { key, p } = payloads[0];
			let payload = Buffer.from(p, 'base64');
			payload[0] = 2;// Change the variant to anything other than 1.
			assert.throws(
				() => xor.decrypt(
					Buffer.from(key, 'utf8'),
					payload
				),
				{ message: 'Variant not implemented' }
			);
		});

		it('invalid HMAC', function() {
			const { key, p } = payloads[0];
			assert.throws(
				() => xor.decrypt(
					Buffer.from(`xxx-${key}`, 'utf8'),// Change the key, makes HMAC invalid.
					Buffer.from(p, 'base64'),
				),
				{ message: 'HMAC is invalid' }
			);
		});

		it('decrypts valid payloads correctly', function() {
			payloads.forEach(payload => {
				const { key, p } = payload;
				const { pin, amount } = xor.decrypt(
					Buffer.from(key, 'utf8'),
					Buffer.from(p, 'base64'),
				);
				assert.strictEqual(pin, payload.pin);
				assert.strictEqual(amount, payload.amount);
			});
		});
	});
});
