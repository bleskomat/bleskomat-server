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
const { getTagDataFromPaymentRequest } = require('lightning-backends');
const { HttpError } = require('lnurl/lib');
const toMilliSatoshis = require('../../../toMilliSatoshis');
const { xor } = require('lnurl-offline');

module.exports = function(app) {

	const { config, debug, lib, lnurlServer } = app.custom;

	app.get('/lnurlpos/:id', function(req, res, next) {
		return Promise.resolve().then(() => {
			const { id } = req.params;
			const { p } = req.query;
			assert.ok(id, new HttpError('Missing required parameter: "id"', 400));
			assert.ok(p, new HttpError('Missing required query parameter: "p"', 400));
			const secret = crypto.createHash('sha256').update(Buffer.from(`${id}-${p}`, 'utf8')).digest('hex');
			const hash = crypto.createHash('sha256').update(Buffer.from(secret, 'hex')).digest('hex');
			return lnurlServer.fetchUrl(hash).then(fetchedUrl => {
				if (fetchedUrl) return fetchedUrl;
				return lnurlServer.getApiKey(id).then(apiKey => {
					assert.ok(apiKey, new HttpError(`Unknown API key ID: "${id}"`, 400));
					const key = Buffer.from(apiKey.key, apiKey.encoding);
					const payload = Buffer.from(req.query.p, 'base64');
					let pin, amount;
					try {
						const decrypted = xor.decrypt(key, payload);
						pin = decrypted.pin;
						amount = decrypted.amount;
					} catch (error) {
						throw new HttpError('Invalid query parameter ("p"): Failed decryption', 400);
					}
					const { exchangeRatesProvider, fiatCurrency } = apiKey;
					assert.ok(fiatCurrency, `Missing fiatCurrency for API key: ${id}`);
					return coinRates.get({
						provider: exchangeRatesProvider || config.coinRates.defaults.provider,
						currencies: { from: 'BTC', to: fiatCurrency },
					}).then(rate => {
						const amountMSats = toMilliSatoshis(parseInt(amount) / 100, rate);
						const tag = 'payRequest';
						const params = {
							minSendable: amountMSats,
							maxSendable: amountMSats,
							metadata: '[["text/plain", "lnurlpos bleskomat server"]]',
							successAction: {
								url: lnurlServer.getUrl('/lnurlpos/' + encodeURIComponent(id) + '/success?p=' + encodeURIComponent(req.query.p)),
								tag: 'url',
							},
							lnurlpos: { amount, pin, p },
						};
						return lnurlServer.createUrl(secret, tag, params, { uses: 1 }).then(() => {
							return lnurlServer.fetchUrl(hash);
						});
					});
				});
			}).then(fetchedUrl => {
				const { endpoint } = lnurlServer.options;
				const callback = lnurlServer.getUrl(`${endpoint}/${secret}`);
				const { params, tag } = fetchedUrl;
				const { minSendable, maxSendable, metadata } = params;
				res.status(200).json({ callback, tag, minSendable, maxSendable, metadata });
			});
		}).catch(next);
	});

	const paymentHashes = new Map();
	lnurlServer.on('payRequest:action:processed', function(event) {
		const { params, result } = event;
		const { p, pin } = params.lnurlpos;
		const { invoice } = result;
		const paymentHash = getTagDataFromPaymentRequest(invoice, 'payment_hash');
		paymentHashes.set(p, { paymentHash, pin });
	});

	app.get('/lnurlpos/:id/success', function(req, res, next) {
		return Promise.resolve().then(() => {
			assert.ok(req.query.p, new HttpError('Missing required query parameter: "p"', 400));
			assert.ok(paymentHashes.has(req.query.p), new HttpError('Payment request not processed yet', 402));
			const { pin, paymentHash } = paymentHashes.get(req.query.p);
			return lnurlServer.ln.getInvoiceStatus(paymentHash).then(result => {
				assert.ok(result, `Failed to get invoice status from LN backend: Invoice payment hash = ${paymentHash}`);
				const { settled } = result;
				assert.ok(settled, new HttpError('Invoice not settled yet', 402));
				res.status(200).send(`<html><head></head><body><h1>Payment Successful</h1><p>Your PIN:</p><p style="font-size: 2rem; font-weight: 500;"><b>${pin}</b></p></body></html>`);
			})
		}).catch(error => {
			// Catch and send errors as plaintext.
			if (!(error instanceof HttpError)) {
				debug.error(error);
				error = new HttpError('Unexpected error', 500);
			}
			const { message, status } = error;
			return res.status(status).send(message);
		});
	});
};
