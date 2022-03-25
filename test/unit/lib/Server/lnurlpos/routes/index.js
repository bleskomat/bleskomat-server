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
const coinRates = require('coin-rates');
const { createHash } = require('lnurl/lib');

coinRates.providers.push({
	name: 'lnurlposTests',
	url: 'http://localhost:3000/does-not-exist',
	parseResponseBody: function(body) {
		return '39502.10245';
	},
});

describe('lnurlpos', function() {

	let config, server, apiKey;
	before(function() {
		config = this.helpers.prepareConfig();
		config.lnurlpos.enabled = true;
		apiKey = {
			id: 'test-key-id',
			key: 'test-super-secret-key',
			encoding: 'utf8',
			fiatCurrency: 'EUR',
			exchangeRatesProvider: 'lnurlposTests',
		};
		config.lnurl.auth.apiKeys = [ apiKey ];
		return this.helpers.createServer(config).then(result => {
			server = result;
		});
	});

	after(function() {
		if (server) return server.close({ force: true }).then(() => {
			server = null;
		});
	});

	describe('GET /lnurlpos/:id', function() {

		it('missing id', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/lnurlpos`,
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 404);
				assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Not found' });
			});
		});

		it('missing p', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/lnurlpos/${apiKey.id}`,
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 400);
				assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Missing required query parameter: "p"' });
			});
		});

		it('API key ID does not match any key', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/lnurlpos/does-not-exist`,
				qs: { p: 'xxx' },
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 400);
				assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Unknown API key ID: "does-not-exist"' });
			});
		});

		it('payload signed by different API key', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/lnurlpos/${apiKey.id}`,
				qs: { p: 'AQhnxmlzUf9K7AULR4UZRd16oDOpwKn9' },
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 400);
				assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Invalid query parameter ("p"): Failed decryption' });
			});
		});

		it('payload w/ invalid HMAC', function() {
			let payload = Buffer.from('AQhnxmlzUf9K7AULR4UZRd16oDOpwKn9', 'base64');
			payload[9] = payload[9] ^ 1;
			const p = payload.toString('base64');
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/lnurlpos/${apiKey.id}`,
				qs: { p },
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 400);
				assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Invalid query parameter ("p"): Failed decryption' });
			});
		});

		it('valid API key ID and payload', function() {
			const p = 'AQhnxmlzUf9K7AW4Mepe_8ArcfITXgyU';// amount = 21, pin = 4206
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/lnurlpos/${apiKey.id}`,
				qs: { p },
			}).then(infoResult => {
				const { response, body } = infoResult;
				assert.strictEqual(response.statusCode, 200);
				assert.strictEqual(body.tag, 'payRequest');
				assert.strictEqual(body.minSendable, 531000);
				assert.strictEqual(body.maxSendable, 531000);
				assert.strictEqual(body.metadata, '[["text/plain", "lnurlpos bleskomat server"]]');
				const { callback } = body;
				const match = callback.match(new RegExp(`^${config.lnurl.url}${config.lnurl.endpoint}/([a-z0-9]+)$`));
				const k1 = match && match[1] || null;
				assert.ok(k1);
				const hash = createHash(k1);
				return server.store.fetch(hash).then(fetchedUrl => {
					assert.ok(fetchedUrl);
					assert.strictEqual(fetchedUrl.tag, 'payRequest');
					return this.helpers.request('get', {
						url: callback,
						qs: { amount: body.minSendable },
					}).then(actionResult => {
						assert.strictEqual(actionResult.response.statusCode, 200);
						assert.ok(actionResult.body.pr);
						assert.deepStrictEqual(actionResult.body.successAction, {
							url: `${config.lnurl.url}/lnurlpos/` + encodeURIComponent(apiKey.id) + '/success?p=' + encodeURIComponent(p),
							tag: 'url',
							description: '',
						});
					});
				});
			});
		});
	});

	describe('GET /lnurlpos/:id/success', function() {

		it('missing p', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/lnurlpos/` + encodeURIComponent(apiKey.id) + '/success',
			}).then(result => {
				const { body, response } = result;
				assert.deepStrictEqual(body, 'Missing required query parameter: "p"');
			});
		});

		it('invoice not created yet', function() {
			const p = 'AQhnxmlzUf9K7AW4jf5K_4vPUFP538fN';
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/lnurlpos/` + encodeURIComponent(apiKey.id) + '/success?p=' + encodeURIComponent(p),
			}).then(result => {
				const { body, response } = result;
				assert.deepStrictEqual(body, 'Payment request not processed yet');
			});
		});

		it('invoice not settled', function() {
			server.ln.options.settled = false;// dummy backend will provide `settled: false` response for all invoices
			const p = 'AQhnxmlzUf9K7AW4Mepe_8ArcfITXgyU';
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/lnurlpos/` + encodeURIComponent(apiKey.id) + '?p=' + encodeURIComponent(p),
			}).then(infoResult => {
				const { callback, minSendable } = infoResult.body;
				return this.helpers.request('get', {
					url: callback,
					qs: { amount: minSendable },
				}).then(actionResult => {
					return this.helpers.request('get', {
						url: `${config.lnurl.url}/lnurlpos/` + encodeURIComponent(apiKey.id) + '/success?p=' + encodeURIComponent(p),
					}).then(successResult => {
						assert.deepStrictEqual(successResult.body, 'Invoice not settled yet');
					});
				});
			});
		});

		it('invoice settled', function() {
			server.ln.options.settled = true;// dummy backend will provide `settled: true` response for all invoices
			const p = 'AQhnxmlzUf9K7AW4jf5K_4vPUFP538fN';// pin = 1234
			return this.helpers.request('get', {
				url: `${config.lnurl.url}/lnurlpos/` + encodeURIComponent(apiKey.id) + '?p=' + encodeURIComponent(p),
			}).then(infoResult => {
				const { callback, minSendable } = infoResult.body;
				return this.helpers.request('get', {
					url: callback,
					qs: { amount: minSendable },
				}).then(actionResult => {
					return this.helpers.request('get', {
						url: `${config.lnurl.url}/lnurlpos/` + encodeURIComponent(apiKey.id) + '/success?p=' + encodeURIComponent(p),
					}).then(successResult => {
						const { body, response } = successResult;
						assert.strictEqual(typeof body, 'string');
						assert.ok(body.indexOf('<b>1234</b>') !== -1);
					});
				});
			});
		});
	});
});
