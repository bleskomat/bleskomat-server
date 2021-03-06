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
const crypto = require('crypto');
const { generatePaymentRequest } = require('lightning-backends');
const { generateApiKey, prepareSignedQuery } = require('lnurl-offline');
const url = require('url');

coinRates.providers.push({
	name: 'nonDefault',
	url: 'http://localhost:3000/does-not-exist',
	parseResponseBody: function(body) {
		return '52501.00';
	},
});

describe('Server(config)', function() {

	let apiKey, apiKeyNonDefault, config, server;
	before(function() {
		config = this.helpers.prepareConfig();
		config.admin.web = false;
		apiKey = generateApiKey();
		apiKeyNonDefault = generateApiKey();
		apiKeyNonDefault.exchangeRatesProvider = 'nonDefault';
		config.lnurl.auth.apiKeys = [ apiKey, apiKeyNonDefault ];
		return this.helpers.createServer(config).then(result => {
			server = result;
		});
	});

	after(function() {
		return server.close({ force: true });
	});

	it('GET /status', function() {
		return this.helpers.request('get', {
			url: `${config.lnurl.url}/status`,
		}).then(result => {
			const { response, body } = result;
			assert.strictEqual(response.statusCode, 200);
			assert.deepStrictEqual(body, { status: 'OK' });
		});
	});

	it('GET /does-not-exist', function() {
		return this.helpers.request('get', {
			url: `${config.lnurl.url}/does-not-exist`,
		}).then(result => {
			const { response, body } = result;
			assert.strictEqual(response.statusCode, 404);
			assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Not found' });
		});
	});

	describe('HTTP GET /u', function() {

		it('missing secret', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}${config.lnurl.endpoint}`,
				qs: {},
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 400);
				assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Missing secret' });
			});
		});

		it('missing API key ID', function() {
			let query = prepareSignedQuery(apiKey, 'withdrawRequest');
			delete query.id;
			return this.helpers.request('get', {
				url: `${config.lnurl.url}${config.lnurl.endpoint}`,
				qs: query,
				method: 'GET',
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 400);
				assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Failed API key signature check: Missing "id"' });
			});
		});

		['channelRequest', 'login', 'payRequest'].forEach(tag => {
			it(`unsupported tag: "${tag}"`, function() {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}${config.lnurl.endpoint}`,
					qs: prepareSignedQuery(apiKey, tag),
				}).then(result => {
					const { response, body } = result;
					assert.strictEqual(response.statusCode, 400);
					assert.deepStrictEqual(body, { status: 'ERROR', reason: `Unsupported tag: "${tag}"` });
				});
			});
		});

		it('min/maxWithdrawable not equal', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}${config.lnurl.endpoint}`,
				qs: prepareSignedQuery(apiKey, 'withdrawRequest', {
					fiatCurrency: 'EUR',
					minWithdrawable: '1.00',
					maxWithdrawable: '2.00',
					defaultDescription: '',
				}),
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 400);
				assert.deepStrictEqual(body, { status: 'ERROR', reason: 'min/maxWithdrawable must be equal' });
			});
		});

		it('missing fiat currency symbol', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}${config.lnurl.endpoint}`,
				qs: prepareSignedQuery(apiKey, 'withdrawRequest', {
					minWithdrawable: '1.00',
					maxWithdrawable: '1.00',
					defaultDescription: '',
				}),
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 400);
				assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Missing required fiat currency symbol: "f" or "fiatCurrency"' });
			});
		});

		it('valid, signed lnurl-withdraw request', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}${config.lnurl.endpoint}`,
				qs: prepareSignedQuery(apiKey, 'withdrawRequest', {
					fiatCurrency: 'EUR',
					minWithdrawable: '1.00',
					maxWithdrawable: '1.00',
					defaultDescription: '',
				}),
			}).then(result => {
				const { response, body } = result;
				assert.strictEqual(response.statusCode, 200);
				assert.strictEqual(body.minWithdrawable, 1000);
				assert.strictEqual(body.maxWithdrawable, 1000);
				assert.strictEqual(body.defaultDescription, '');
				assert.ok(body.callback);
				assert.ok(body.k1);
				assert.strictEqual(body.tag, 'withdrawRequest');
				const { callback, k1 } = body;
				const hash = crypto.createHash('sha256').update(Buffer.from(k1, 'hex')).digest('hex');
				return server.store.fetch(hash).then(fetchedUrl => {
					assert.notStrictEqual(fetchedUrl, null);
					assert.strictEqual(typeof fetchedUrl, 'object');
					assert.strictEqual(fetchedUrl.remainingUses, 1);
					const parsedUrl = url.parse(callback);
					assert.strictEqual(parsedUrl.hostname, config.lnurl.host);
					assert.strictEqual(parsedUrl.port, config.lnurl.port.toString());
					assert.strictEqual(parsedUrl.pathname, config.lnurl.endpoint);
					const pr = generatePaymentRequest(body.minWithdrawable);
					return this.helpers.request('get', {
						url: `${config.lnurl.url}${config.lnurl.endpoint}`,
						qs: { k1, pr },
					}).then(result2 => {
						const response2 = result2.response;
						const body2 = result2.body;
						assert.strictEqual(response2.statusCode, 200);
						assert.deepStrictEqual(body2, { status: 'OK' });
						return server.store.fetch(hash).then(fetchedUrl2 => {
							assert.notStrictEqual(fetchedUrl2, null);
							assert.strictEqual(typeof fetchedUrl2, 'object');
							assert.strictEqual(fetchedUrl2.remainingUses, 0);
						});
					});
				});
			});
		});

		describe('apiKey w/ non-default exchange rates provider', function() {

			it('should use the correct exchange rates provider', function() {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}${config.lnurl.endpoint}`,
					qs: prepareSignedQuery(apiKeyNonDefault, 'withdrawRequest', {
						fiatCurrency: 'EUR',
						minWithdrawable: '1.00',
						maxWithdrawable: '1.00',
						defaultDescription: '',
					}),
				}).then(result => {
					const { response, body } = result;
					assert.strictEqual(response.statusCode, 200);
					assert.strictEqual(body.minWithdrawable, 1904000);
					assert.strictEqual(body.maxWithdrawable, 1904000);
				});
			});
		});
	});

	it('GET /admin', function() {
		return this.helpers.request('get', {
			url: `${config.lnurl.url}/admin`,
		}).then(result => {
			const { response, body } = result;
			assert.strictEqual(response.statusCode, 404);
			assert.deepStrictEqual(body, { status: 'ERROR', reason: 'Not found' });
		});
	});
});
