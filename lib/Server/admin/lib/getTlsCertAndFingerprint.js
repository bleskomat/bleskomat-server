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
const tls = require('tls');
const url = require('url');

module.exports = function(host, options) {
	return new Promise((resolve, reject) => {
		try {
			options = _.defaults(options || {}, {
				timeout: 5000,
			});
			if (!host) {
				throw new Error('Missing required argument: "host"');
			}
			if (!_.isString(host)) {
				throw new Error('Invalid argument ("host"): String expected');
			}
			const parsedUrl = url.parse(`https://${host}`);
			const { hostname, port } = parsedUrl;
			const timeout = setTimeout(function() {
				done(new Error(`Timed-out while connecting to "${host}"`));
			}, options.timeout);
			const done = function(error, result) {
				clearTimeout(timeout);
				client && client.end();
				if (error) return reject(error);
				resolve(result);
			};
			const client = tls.connect(port, hostname, {
				requestCert: true,
				rejectUnauthorized: false,
			}, function() {
				try {
					let cert = client.getPeerCertificate(true);
					const { fingerprint, fingerprint256 } = cert;
					const { authorized } = client;
					const prefix = '-----BEGIN CERTIFICATE-----\n';
					const postfix = '-----END CERTIFICATE-----';
					const pems = {};
					while (cert.issuerCertificate && _.isUndefined(pems[cert.fingerprint256])) {
						pems[cert.fingerprint256] = prefix + cert.raw.toString('base64').match(/.{0,64}/g).join('\n') + postfix;
						cert = cert.issuerCertificate;
					}
					const pem = _.values(pems).join('\n\n');
					return done(null, {
						authorized,
						fingerprint,
						fingerprint256,
						pem,
					});
				} catch (error) {
					return done(error);
				}
			});
			client.once('error', done);
		} catch (error) {
			return reject(error);
		}
	});
};
