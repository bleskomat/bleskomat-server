const crypto = require('crypto');

module.exports = {
	compare: function(secret, hash) {
		try {
			if (!Buffer.isBuffer(hash) && typeof hash !== 'string') {
				throw new Error('Invalid argument ("hash"): String or Buffer expected');
			}
			const parts = hash.split(';');
			const salt = Buffer.from(parts[0], 'hex');
			if (!salt) {
				throw new Error('Invalid argument ("hash"): Could not derive salt');
			}
			const keylen = parseInt(parts[1]);
			if (Number.isNaN(keylen) || !Number.isInteger(keylen)) {
				throw new Error('Invalid argument ("hash"): Could not derive keylen');
			}
			const cost = parseInt(parts[2]);
			if (Number.isNaN(cost) || !Number.isInteger(cost)) {
				throw new Error('Invalid argument ("hash"): Could not derive cost');
			}
			const options = { cost };
			return this.hash(secret, salt, keylen, options).then(result => {
				return result === hash;
			});
		} catch (error) {
			return Promise.reject(error);
		}
	},
	generateSalt: function(numBytes) {
		return crypto.randomBytes(numBytes);
	},
	hash: function(secret, salt, keylen, options) {
		try {
			if (!Buffer.isBuffer(salt) && typeof salt !== 'string') {
				throw new Error('Invalid argument ("salt"): String or Buffer expected');
			}
			if (!Buffer.isBuffer(secret) && typeof secret !== 'string') {
				throw new Error('Invalid argument ("secret"): String or Buffer expected');
			}
			if (typeof keylen !== 'number') {
				throw new Error('Invalid argument ("keylen"): Number expected');
			}
			if (options && typeof options !== 'object') {
				throw new Error('Invalid argument ("options"): Object expected');
			}
			options = options || {};
			options.cost = options.cost || 16384;// 2^14
			return new Promise((resolve, reject) => {
				// https://nodejs.org/docs/latest-v12.x/api/crypto.html#crypto_crypto_scrypt_password_salt_keylen_options_callback
				crypto.scrypt(secret, salt, keylen, options, (error, derivedKey) => {
					if (error) return reject(error);
					const hash = [
						salt.toString('hex'),
						keylen.toString(),
						options.cost.toString(),
						derivedKey.toString('hex'),
					].join(';');
					resolve(hash);
				});
			});
		} catch (error) {
			return Promise.reject(error);
		}
	},
};
