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
const debug = {
	error: require('debug')('bleskomat-server:error'),
};
const { generatePaymentRequest } = require('lnurl/lib');
const lnurl = require('lnurl');
const { ValidationError } = require('form');

const dummyServer = lnurl.createServer({
	listen: false,
	lightning: null,
	store: { backend: 'memory', config: { noWarning: true } },
});

const errorMessages = {
	ok: {
		'lnd': [
			'no_route',
		],
		'coinos': [
			'no_route',
		],
		'lnbits': [
			'Insufficient balance',
			'is not reachable directly and all routehints were unusable',
		],
		'lndhub': [
			'Payment failed',
		],
		'lnpay': [
			'FAILURE_REASON_NO_ROUTE',
		],
		'lntxbot': [
			'Payment failed',
		],
		'opennode': [
			'Invalid payment request',
		],
	},
	notOk: {
		'lnd': [
			'verification failed',
			'cannot determine data format',
			'field data extends past end of buffer',
			'fields out of order',
			'invoice not for current active network',
			'encoding/hex: invalid byte',
		],
		'coinos': [
			'Unauthorized',
		],
		'lnbits': [
		],
		'lndhub': [
			'bad auth',
			'Invalid option',
		],
		'lnpay': [
			'Unauthorized',
			'Wallet not found',
		],
		'lntxbot': [
			'bad auth',
		],
		'opennode': [
			'Invalid API key for request',
		],
	},
};

errorMessages.notOk = _.mapObject(errorMessages.notOk, messages => {
	return messages.concat([
		'Unexpected response format from LN backend',
	]);
});

const regex = _.mapObject(errorMessages, (errorMessagesByBackend, type) => {
	return _.mapObject(errorMessagesByBackend, (messages, backend) => {
		if (messages && messages.length > 0) {
			return new RegExp(messages.join('|'), 'i');
		}
		return null;
	});
});

const normalizeRegex = new RegExp([
	'Unexpected response from LN backend: HTTP_[0-9]{3,3}_ERROR:',
	'Unexpected response format from LN backend',
	'\\[(lndhub|lntxbot)\\] Request Failed',
].join('|'), 'i');

const normalizeErrorMessage = function(message) {
	if (normalizeRegex.test(message)) {
		return _.last(message.split('\n'));
	}
	return message;
};

module.exports = function(lightning) {
	const { backend } = lightning;
	return Promise.resolve().then(() => {
		const ln = dummyServer.prepareLightningBackend(lightning);
		const invoice = generatePaymentRequest(1000);// msats
		return ln.payInvoice(invoice).then(() => {
			// Payment successful. Passed check.
			return true;
		});
	}).catch(error => {
		const notOk = regex.notOk[backend];
		const ok = regex.ok[backend];
		if (ok && ok.test(error.message)) {
			// An error occurred, but unrelated to authentication.
			return true;
		}
		if (notOk && notOk.test(error.message)) {
			// Failed check. Send the error to the client.
			const message = normalizeErrorMessage(error.message);
			throw new ValidationError(`Failed Lightning configuration check: ${message}`);
		}
		// Failed check. Some unexpected error occurred.
		debug.error(error);
		throw new ValidationError('Failed Lightning configuration check: Unexpected error');
	});
};
