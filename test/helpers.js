const _ = require('underscore');
const { createSignature, generateRandomByteString, prepareQueryPayloadString } = require('lnurl/lib');
const http = require('http');
const querystring = require('querystring');

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
