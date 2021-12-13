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
const lnurl = require('lnurl');
const { HttpError } = require('lnurl/lib');
const toMilliSatoshis = require('./toMilliSatoshis');

module.exports = function(config) {

	/*
		For a list of possible options, see:
		https://github.com/chill117/lnurl-node#options-for-createserver-method
	*/
	const server = lnurl.createServer(config.lnurl);

	server.bindToHook('url:signed', function(req, res, next) {
		const { id, signature, tag } = req.query;
		if (!id || !signature) {
			// Not a signed LNURL. Do nothing here.
			return next();
		}
		if (tag !== 'withdrawRequest') {
			return next(new HttpError(`Unsupported tag: "${tag}"`, 400));
		}
		const fiatCurrency = req.query.f || req.query.fiatCurrency;
		if (!fiatCurrency) {
			// Missing fiat currency symbol.
			return next(new HttpError('Missing required fiat currency symbol: "f" or "fiatCurrency"', 400));
		}
		if (req.query.minWithdrawable !== req.query.maxWithdrawable) {
			return next(new HttpError('min/maxWithdrawable must be equal', 400));
		}
		return server.getApiKey(id).then(apiKey => {
			const { provider } = apiKey;
			// Amounts are denominated in fiat currency.
			// Get the current exchange rate so that the amounts can be converted to sats.
			return server.getExchangeRate({
				currencies: {
					from: 'BTC',
					to: fiatCurrency,
				},
				provider,
			}).then(rate => {
				const { tag } = req.query;
				switch (tag) {
					case 'withdrawRequest':
						// Override the query object with the amounts in msats.
						req.query.minWithdrawable = req.query.maxWithdrawable = toMilliSatoshis(req.query.minWithdrawable, rate);
						break;
				}
				next();
			});
		}).catch(next);
	});

	server.getExchangeRate = function(options) {
		options = _.defaults(options || {}, config.coinRates.defaults);
		return coinRates.get(options);
	};

	return server;
};
