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
const { expect } = require('chai');
const { createHash, generateApiKey, generatePaymentRequest } = require('lnurl/lib');
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
			expect(response.statusCode).to.equal(200);
			expect(body).to.deep.equal({ status: 'OK' });
		});
	});

	it('GET /does-not-exist', function() {
		return this.helpers.request('get', {
			url: `${config.lnurl.url}/does-not-exist`,
		}).then(result => {
			const { response, body } = result;
			expect(response.statusCode).to.equal(404);
			expect(body).to.deep.equal({ status: 'ERROR', reason: 'Not found' });
		});
	});

	describe('HTTP GET /u', function() {

		it('missing secret', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}${config.lnurl.endpoint}`,
				qs: {},
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(400);
				expect(body).to.deep.equal({ status: 'ERROR', reason: 'Missing secret' });
			});
		});

		it('missing API key ID', function() {
			let query = this.helpers.prepareSignedQuery(apiKey);
			delete query.id;
			return this.helpers.request('get', {
				url: `${config.lnurl.url}${config.lnurl.endpoint}`,
				qs: query,
				method: 'GET',
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(400);
				expect(body).to.deep.equal({ status: 'ERROR', reason: 'Failed API key signature check: Missing "id"' });
			});
		});

		_.each(['channelRequest', 'login', 'payRequest'], tag => {
			it(`unsupported tag: "${tag}"`, function() {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}${config.lnurl.endpoint}`,
					qs: this.helpers.prepareSignedQuery(apiKey, {
						tag,
					}),
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(400);
					expect(body).to.deep.equal({ status: 'ERROR', reason: `Unsupported tag: "${tag}"` });
				});
			});
		});

		it('min/maxWithdrawable not equal', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}${config.lnurl.endpoint}`,
				qs: this.helpers.prepareSignedQuery(apiKey, {
					tag: 'withdrawRequest',
					fiatCurrency: 'EUR',
					minWithdrawable: '1.00',
					maxWithdrawable: '2.00',
					defaultDescription: '',
				}),
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(400);
				expect(body).to.deep.equal({ status: 'ERROR', reason: 'min/maxWithdrawable must be equal' });
			});
		});

		it('missing fiat currency symbol', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}${config.lnurl.endpoint}`,
				qs: this.helpers.prepareSignedQuery(apiKey, {
					tag: 'withdrawRequest',
					minWithdrawable: '1.00',
					maxWithdrawable: '1.00',
					defaultDescription: '',
				}),
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(400);
				expect(body).to.deep.equal({ status: 'ERROR', reason: 'Missing required fiat currency symbol: "f" or "fiatCurrency"' });
			});
		});

		it('valid, signed lnurl-withdraw request', function() {
			return this.helpers.request('get', {
				url: `${config.lnurl.url}${config.lnurl.endpoint}`,
				qs: this.helpers.prepareSignedQuery(apiKey, {
					tag: 'withdrawRequest',
					fiatCurrency: 'EUR',
					minWithdrawable: '1.00',
					maxWithdrawable: '1.00',
					defaultDescription: '',
				}),
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(200);
				expect(body.minWithdrawable).to.equal(1000);
				expect(body.maxWithdrawable).to.equal(1000);
				expect(body.defaultDescription).to.equal('');
				expect(body).to.have.property('callback');
				expect(body).to.have.property('k1');
				expect(body.tag).to.equal('withdrawRequest');
				const { callback, k1 } = body;
				const hash = createHash(k1);
				return server.store.fetch(hash).then(fetchedUrl => {
					expect(fetchedUrl).to.not.equal(null);
					expect(fetchedUrl).to.be.an('object');
					expect(fetchedUrl.remainingUses).to.equal(1);
					const parsedUrl = url.parse(callback);
					expect(parsedUrl.hostname).to.equal(config.lnurl.host);
					expect(parsedUrl.port).to.equal(config.lnurl.port.toString());
					expect(parsedUrl.pathname).to.equal(config.lnurl.endpoint);
					const pr = generatePaymentRequest(body.minWithdrawable);
					return this.helpers.request('get', {
						url: `${config.lnurl.url}${config.lnurl.endpoint}`,
						qs: { k1, pr },
					}).then(result2 => {
						const response2 = result2.response;
						const body2 = result2.body;
						expect(response2.statusCode).to.equal(200);
						expect(body2).to.deep.equal({ status: 'OK' });
						return server.store.fetch(hash).then(fetchedUrl2 => {
							expect(fetchedUrl2).to.not.equal(null);
							expect(fetchedUrl2).to.be.an('object');
							expect(fetchedUrl2.remainingUses).to.equal(0);
						});
					});
				});
			});
		});

		describe('apiKey w/ non-default exchange rates provider', function() {

			it('should use the correct exchange rates provider', function() {
				return this.helpers.request('get', {
					url: `${config.lnurl.url}${config.lnurl.endpoint}`,
					qs: this.helpers.prepareSignedQuery(apiKeyNonDefault, {
						tag: 'withdrawRequest',
						fiatCurrency: 'EUR',
						minWithdrawable: '1.00',
						maxWithdrawable: '1.00',
						defaultDescription: '',
					}),
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(200);
					expect(body.minWithdrawable).to.equal(1904000);
					expect(body.maxWithdrawable).to.equal(1904000);
				});
			});
		});
	});

	it('GET /admin', function() {
		return this.helpers.request('get', {
			url: `${config.lnurl.url}/admin`,
		}).then(result => {
			const { response, body } = result;
			expect(response.statusCode).to.equal(404);
			expect(body).to.deep.equal({ status: 'ERROR', reason: 'Not found' });
		});
	});
});
