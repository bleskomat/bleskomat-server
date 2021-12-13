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
const { expect } = require('chai');
const { generateApiKey, generatePaymentRequest } = require('lnurl/lib');
const helpers = require('../../helpers');
const { Server } = require('../../../lib');
const url = require('url');

describe('Server(config)', function() {

	let apiKey, config, server;
	before(function(done) {
		apiKey = generateApiKey();
		config = require('../../../config');
		config.lnurl.auth.apiKeys = [ apiKey ];
		config.lnurl.store.config.noWarning = true;
		server = new Server(config);
		server.once('listening', done);
	});

	after(function() {
		return server.close({ force: true });
	});

	it('HTTP GET /status', function() {
		return helpers.request({
			method: 'GET',
			hostname: config.lnurl.host,
			port: config.lnurl.port,
			path: '/status',
		}).then(result => {
			const { response, body } = result;
			expect(response.statusCode).to.equal(200);
			expect(body).to.equal('{"status":"OK"}');
		});
	});

	it('HTTP GET /does-not-exist', function() {
		return helpers.request({
			method: 'GET',
			hostname: config.lnurl.host,
			port: config.lnurl.port,
			path: '/does-not-exist',
		}).then(result => {
			const { response, body } = result;
			expect(response.statusCode).to.equal(404);
			expect(body).to.equal('{"status":"ERROR","reason":"Not found"}');
		});
	});

	describe('HTTP GET /u', function() {

		it('missing secret', function() {
			return helpers.request({
				method: 'GET',
				hostname: config.lnurl.host,
				port: config.lnurl.port,
				path: config.lnurl.endpoint,
				data: {},
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(400);
				expect(body).to.equal('{"status":"ERROR","reason":"Missing secret"}');
			});
		});

		it('missing API key ID', function() {
			let query = helpers.prepareSignedQuery(apiKey);
			delete query.id;
			return helpers.request({
				method: 'GET',
				hostname: config.lnurl.host,
				port: config.lnurl.port,
				path: config.lnurl.endpoint,
				data: query,
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(400);
				expect(body).to.equal('{"status":"ERROR","reason":"Failed API key signature check: Missing \\"id\\""}');
			});
		});

		_.each(['channelRequest', 'login', 'payRequest'], tag => {
			it(`unsupported tag: "${tag}"`, function() {
				return helpers.request({
					method: 'GET',
					hostname: config.lnurl.host,
					port: config.lnurl.port,
					path: config.lnurl.endpoint,
					data: helpers.prepareSignedQuery(apiKey, {
						tag,
					}),
				}).then(result => {
					const { response, body } = result;
					expect(response.statusCode).to.equal(400);
					expect(body).to.equal(`{"status":"ERROR","reason":"Unsupported tag: \\"${tag}\\""}`);
				});
			});
		});

		it('min/maxWithdrawable not equal', function() {
			return helpers.request({
				method: 'GET',
				hostname: config.lnurl.host,
				port: config.lnurl.port,
				path: config.lnurl.endpoint,
				data: helpers.prepareSignedQuery(apiKey, {
					tag: 'withdrawRequest',
					fiatCurrency: 'EUR',
					minWithdrawable: '1.00',
					maxWithdrawable: '2.00',
					defaultDescription: '',
				}),
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(400);
				expect(body).to.equal('{"status":"ERROR","reason":"min/maxWithdrawable must be equal"}');
			});
		});

		it('missing fiat currency symbol', function() {
			return helpers.request({
				method: 'GET',
				hostname: config.lnurl.host,
				port: config.lnurl.port,
				path: config.lnurl.endpoint,
				data: helpers.prepareSignedQuery(apiKey, {
					tag: 'withdrawRequest',
					minWithdrawable: '1.00',
					maxWithdrawable: '1.00',
					defaultDescription: '',
				}),
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(400);
				expect(body).to.equal('{"status":"ERROR","reason":"Missing required fiat currency symbol: \\"f\\" or \\"fiatCurrency\\""}');
			});
		});

		it('valid, signed lnurl-withdraw request', function() {
			return helpers.request({
				method: 'GET',
				hostname: config.lnurl.host,
				port: config.lnurl.port,
				path: config.lnurl.endpoint,
				data: helpers.prepareSignedQuery(apiKey, {
					tag: 'withdrawRequest',
					fiatCurrency: 'EUR',
					minWithdrawable: '1.00',
					maxWithdrawable: '1.00',
					defaultDescription: '',
				}),
			}).then(result => {
				const { response, body } = result;
				expect(response.statusCode).to.equal(200);
				const json = JSON.parse(body);
				expect(json.minWithdrawable).to.equal(1000);
				expect(json.maxWithdrawable).to.equal(1000);
				expect(json.defaultDescription).to.equal('');
				expect(json).to.have.property('callback');
				expect(json).to.have.property('k1');
				expect(json.tag).to.equal('withdrawRequest');
				const { callback, k1 } = json;
				const parsedUrl = url.parse(callback);
				expect(parsedUrl.hostname).to.equal(config.lnurl.host);
				expect(parsedUrl.port).to.equal(config.lnurl.port.toString());
				expect(parsedUrl.pathname).to.equal(config.lnurl.endpoint);
				const pr = generatePaymentRequest(json.minWithdrawable);
				return helpers.request({
					method: 'GET',
					hostname: parsedUrl.hostname,
					port: parsedUrl.port,
					path: parsedUrl.pathname,
					data: { k1, pr },
				}).then(result2 => {
					const response2 = result2.response;
					const body2 = result2.body;
					expect(response2.statusCode).to.equal(200);
					expect(body2).to.equal('{"status":"OK"}');
				});
			});
		});
	});
});
