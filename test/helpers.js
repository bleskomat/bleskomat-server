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
const coinRates = require('coin-rates');
const { createSignature, generateRandomByteString, prepareQueryPayloadString } = require('lnurl/lib');
const { expect } = require('chai');
const fs = require('fs').promises;
const http = require('http');
const https = require('https');
const path = require('path');
const pem = require('pem');
const { Server } = require('../lib');
const querystring = require('querystring');
const url = require('url');

coinRates.providers.push({
	name: 'dummy',
	url: 'http://localhost:3000/does-not-exist',
	parseResponseBody: function(body) {
		return 1e8;// 1 BTC = 1e8 sats
	},
});

if (_.isUndefined(process.env.BLESKOMAT_SERVER_COINRATES_DEFAULTS_PROVIDER)) {
	process.env.BLESKOMAT_SERVER_COINRATES_DEFAULTS_PROVIDER = 'dummy';
}

// https://github.com/motdotla/dotenv#usage
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {

	tmpDir: path.join(__dirname, 'tmp'),

	prepareConfig: function() {
		let config = JSON.parse(JSON.stringify(require('../config')));
		config.lnurl.store.config.noWarning = true;
		config.env.filePath = path.join(this.tmpDir, '.env');
		config.getTlsCertAndFingerprint.timeout = 200;
		return config;
	},

	createHttpsServer: function(port, host) {
		port = port || 18080;
		host = host || '127.0.0.1';
		return this.createPemCertificate({ altNames: [ host ] }).then(pem => {
			return new Promise((resolve, reject) => {
				try {
					let server = https.createServer({
						key: pem.serviceKey,
						cert: pem.certificate,
					}).listen(port, host, () => {
						resolve(server);
					});
					// Keep a hash of connected sockets.
					// This is used when closing the server - when force-closing all socket connections.
					let sockets = {};
					server.on('connection', function(socket) {
						const socketId = _.uniqueId('test:helper:https-server:socket:').split('-')[1];
						sockets[socketId] = socket;
						socket.once('close', function() {
							delete sockets[socketId];
						});
					});
					server.hostname = `${host}:${port}`;
					server.pem = pem;
					const close = server.close.bind(server);
					server.close = function() {
						_.invoke(sockets, 'destroy');
						return new Promise((closeResolve, closeReject) => {
							close(error => {
								if (error) return closeReject(error);
								closeResolve();
							});
						});
					};
				} catch (error) {
					return reject(error);
				}
			});
		});
	},

	createPemCertificate: function(options) {
		options = _.defaults(options || {}, {
			selfSigned: true,
			days: 3650,
		});
		return new Promise((resolve, reject) => {
			try {
				pem.createCertificate(options, (error, result) => {
					if (error) return reject(error);
					resolve(result);
				});
			} catch (error) {
				return reject(error);
			}
		});
	},

	createServer: function(config) {
		try {
			const server = new Server(config);
			const close = server.close.bind(server);
			server.close = function(options) {
				options = _.defaults(options || {}, {
					force: true,// Force-close socket connections
					store: false,// Do not close the data store
				});
				return close(options).then(() => {
					let promises = [];
					if (server.store.db && server.store.db.migrate) {
						// Rollback all migrations.
						promises.push(server.store.db.migrate.rollback(null, true));
					}
					return Promise.all(promises).then(() => {
						// Now we can close the store.
						return server.store.close();
					});
				});
			};
			return Promise.all([
				server.store && server.store.onReady && server.store.onReady() || Promise.resolve(),
				new Promise((resolve, reject) => {
					server.once('listening', () => {
						resolve();
					});
					server.once('error', reject);
				}),
			]).then(() => {
				return server;
			});
		} catch (error) {
			return Promise.reject(error);
		}
	},

	prepareSignedQuery: function(apiKey, query) {
		query = query || {};
		query.id = apiKey.id;
		if (_.isUndefined(query.nonce)) {
			query.nonce = generateRandomByteString();
		}
		const payload = prepareQueryPayloadString(query);
		const signature = createSignature(payload, Buffer.from(apiKey.key, apiKey.encoding));
		query.signature = signature;
		return query;
	},

	readEnv: function(filePath) {
		return fs.readFile(filePath).then(buffer => {
			return require('dotenv').parse(buffer);
		});
	},

	removeDir: function(dirPath) {
		return fs.readdir(dirPath).then(files => {
			// Delete all files in the directory.
			return Promise.all(_.map(files, file => {
				const filePath = path.join(dirPath, file);
				return fs.stat(filePath).then(stat => {
					if (stat.isDirectory()) {
						// Recursively delete any sub-directories.
						return this.removeDir(filePath);
					}
					// Delete the file.
					return fs.unlink(filePath);
				});
			})).then(() => {
				// Finally delete the directory itself.
				return fs.rmdir(dirPath);
			})
		}).catch(error => {
			if (error) {
				if (/no such file or directory/i.test(error.message)) {
					// Directory doesn't exist. Ignore the error.
				} else {
					// Re-throw any other error.
					throw error;
				}
			}
		});
	},

	request: function(method, requestOptions) {
		return new Promise((resolve, reject) => {
			try {
				const parsedUrl = url.parse(requestOptions.url);
				let options = _.chain(requestOptions).pick('ca', 'headers').extend({
					method: method.toUpperCase(),
					hostname: parsedUrl.hostname,
					port: parsedUrl.port,
					path: parsedUrl.path,
				}).value();
				options.headers = options.headers || {};
				if (requestOptions.qs) {
					options.path += '?' + querystring.stringify(requestOptions.qs);
				}
				let postData;
				if (requestOptions.form) {
					options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
					postData = querystring.stringify(requestOptions.form);
				} else if (requestOptions.body && requestOptions.json) {
					options.headers['Content-Type'] = 'application/json';
					postData = JSON.stringify(requestOptions.body);
				}
				if (postData) {
					options.headers['Content-Length'] = Buffer.byteLength(postData);
				}
				const request = parsedUrl.protocol === 'https:' ? https.request : http.request;
				const req = request(options, function(response) {
					let body = '';
					response.on('data', function(buffer) {
						body += buffer.toString();
					});
					response.on('end', function() {
						if (response.headers['content-type'].indexOf('application/json') !== -1) {
							try {
								body = JSON.parse(body);
							} catch (error) {
								return reject(error);
							}
						}
						resolve({ response, body });
					});
				});
				if (postData) {
					req.write(postData);
				}
				req.once('error', reject);
				req.end();
			} catch (error) {
				return reject(error);
			}
		});
	},
};
