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
const http = require('http');
const path = require('path');
const querystring = require('querystring');

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

	request: function(options) {
		options = _.defaults(options || {}, {
			method: 'GET',
			hostname: 'localhost',
			port: 3000,
			path: '/',
			data: {},
		});
		options.method = options.method.toUpperCase();
		return new Promise((resolve, reject) => {
			if (options.method === 'GET' || options.method === 'DELETE') {
				if (!_.isEmpty(options.data)) {
					options.path += '?' + querystring.stringify(options.data);
				}
			}
			const req = http.request(options, response => {
				let body = '';
				response.on('data', buffer => {
					body += buffer.toString();
				});
				response.on('end', () => {
					resolve({ response, body });
				});
			});
			if (options.method === 'POST' || options.method === 'PUT') {
				if (!_.isEmpty(options.data)) {
					req.write(JSON.stringify(options.data));
				}
			}
			req.once('error', reject);
			req.end();
		});
	},
};
