const assert = require('assert');
const crypto = require('crypto');

module.exports = {
	decrypt: function(key, payload) {
		assert.ok(Buffer.isBuffer(key), 'Invalid argument ("key"): Buffer expected');
		assert.ok(Buffer.isBuffer(payload), 'Invalid argument ("payload"): Buffer expected');
		let pos = 0;
		const variant = payload[pos++];
		assert.strictEqual(variant, 1, 'Variant not implemented');
		const nonceLength = payload[pos++];
		const nonce = payload.subarray(pos++, pos += (nonceLength - 1));
		assert.strictEqual(nonce.length, nonceLength, 'Missing nonce bytes');
		assert.ok(nonce.length >= 8, 'Nonce is too short');
		const dataLength = payload[pos++];
		const data = payload.subarray(pos++, pos += (dataLength - 1));
		assert.ok(nonce.length <= 32, 'Payload is too long for this encryption method');
		assert.strictEqual(data.length, dataLength, 'Missing payload bytes');
		const hmac = payload.subarray(pos);
		assert.ok(hmac.length >= 8, 'HMAC is too short');
		const expected = crypto.createHmac('sha256', key).update(
			Buffer.concat([
				Buffer.from('Data:', 'utf8'),
				payload.subarray(0, payload.length - hmac.length)
			])
		).digest();
		assert.ok(!hmac.compare(expected.subarray(0, hmac.length)), 'HMAC is invalid');
		const secret = crypto.createHmac('sha256', key).update(
			Buffer.concat([
				Buffer.from('Round secret:', 'utf8'),
				nonce
			])
		).digest();
		let buffer = Buffer.alloc(data.length);
		for (let index = 0; index < data.length; index++) {
			buffer[index] = data[index] ^ secret[index];
		}
		let offset = 0;
		// https://github.com/diybitcoinhardware/embit/blob/a43ee04d8619cdb4bbb84dab60002fd9c987ee60/src/embit/compact.py#L29-L36
		const readFrom = function(buffer) {
			int = buffer[offset++];
			if (int >= 0xFD) {
				const bytesToRead = 2 ** (int - 0xFC);
				int = buffer.readUIntLE(1, bytesToRead);
				offset += bytesToRead;
			}
			return int;
		};
		const pin = readFrom(buffer);
		const amount = readFrom(buffer);
		return { pin, amount };
	},
};