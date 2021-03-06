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

const coinRates = require('coin-rates');
const fs = require('fs').promises;
const http = require('http');
const https = require('https');
const path = require('path');
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

if (typeof process.env.BLESKOMAT_SERVER_COINRATES_DEFAULTS_PROVIDER === 'undefined') {
	process.env.BLESKOMAT_SERVER_COINRATES_DEFAULTS_PROVIDER = 'dummy';
}

// https://github.com/motdotla/dotenv#usage
require('dotenv').config({
	override: true,
	path: path.join(__dirname, '.env'),
});

module.exports = {

	tmpDir: path.join(__dirname, 'tmp'),

	prepareConfig: function() {
		let config = JSON.parse(JSON.stringify(require('../config')));
		config.lnurl.store.config.noWarning = true;
		config.env.filePath = path.join(this.tmpDir, '.env');
		config.tlsCheck.timeout = 200;
		return config;
	},

	createServer: function(config) {
		try {
			const server = new Server(config);
			const close = server.close.bind(server);
			server.close = function(options) {
				options = Object.assign({
					force: true,// Force-close socket connections
					store: false,// Do not close the data store
				}, options || {});
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

	readEnv: function(filePath) {
		return fs.readFile(filePath).then(buffer => {
			return require('dotenv').parse(buffer);
		});
	},

	removeDir: function(dirPath) {
		return fs.readdir(dirPath).then(files => {
			// Delete all files in the directory.
			return Promise.all(files.map(file => {
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
				let options = {
					method: method.toUpperCase(),
					hostname: parsedUrl.hostname,
					port: parsedUrl.port,
					path: parsedUrl.path,
					ca: requestOptions.ca || null,
					headers: requestOptions.headers || {},
				};
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
