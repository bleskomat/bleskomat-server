const crypto = require('crypto');

let scrypt = {
	compare: function(secret, hash) {
		return Promise.resolve().then(() => {
			const { salt, keylen, options } = this.parseHash(hash);
			return this.hash(secret, salt, keylen, options).then(result => {
				return result === this.normalizeHash(hash);
			});
		});
	},
	generateSalt: function(numBytes) {
		return crypto.randomBytes(numBytes);
	},
	hash: function(secret, salt, keylen, options) {
		return Promise.resolve().then(() => {
			this.hashCheckArgs(secret, salt, keylen, options);
			options = Object.assign({}, {
				cost: 16384,// 2^14
			}, options || {});
			return new Promise((resolve, reject) => {
				// https://nodejs.org/docs/latest-v12.x/api/crypto.html#crypto_crypto_scrypt_password_salt_keylen_options_callback
				crypto.scrypt(secret, salt, keylen, options, (error, derivedKey) => {
					if (error) return reject(error);
					const hash = this.serializeHash(salt, options, derivedKey);
					resolve(hash);
				});
			});
		});
	},
	hashSync: function(secret, salt, keylen, options) {
		this.hashCheckArgs(secret, salt, keylen, options);
		options = Object.assign({}, {
			cost: 16384,// 2^14
		}, options || {});
		// https://nodejs.org/dist/latest-v12.x/docs/api/crypto.html#crypto_crypto_scryptsync_password_salt_keylen_options
		const derivedKey =  crypto.scryptSync(secret, salt, keylen, options);
		const hash = this.serializeHash(salt, options, derivedKey);
		return hash;
	},
	hashCheckArgs: function(secret, salt, keylen, options) {
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
	},
	normalizeHash: function(hash) {
		const { derivedKey, keylen, salt, options } = this.parseHash(hash);
		return this.serializeHash(salt, options, derivedKey);
	},
	parseHash: function(hash) {
		if (typeof hash !== 'string') {
			throw new Error('Invalid argument ("hash"): String expected');
		}
		const parts = hash.split(';');
		if (parts.length !== 3 && parts.length !== 4) {
			throw new Error('Invalid argument ("hash"): Unknown hash format');
		}
		const salt = Buffer.from(parts[0], 'hex');
		if (!salt) {
			throw new Error('Invalid argument ("hash"): Could not derive salt');
		}
		const cost = parseInt(parts[parts.length - 2]);
		if (Number.isNaN(cost) || !Number.isInteger(cost)) {
			throw new Error('Invalid argument ("hash"): Could not derive cost');
		}
		const derivedKey = Buffer.from(parts[parts.length - 1], 'hex');
		const keylen = derivedKey.byteLength;
		const options = { cost };
		return { derivedKey, keylen, salt, options };
	},
	serializeHash: function(salt, options, derivedKey) {
		return [
			salt.toString('hex'),
			options.cost.toString(),
			derivedKey.toString('hex'),
		].join(';');
	},
};

Object.keys(scrypt).map(key => {
	scrypt[key] = scrypt[key].bind(scrypt);
});

module.exports = scrypt;
