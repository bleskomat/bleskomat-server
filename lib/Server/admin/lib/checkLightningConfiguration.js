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
const lnurl = require('lnurl');
const { generatePaymentRequest } = require('lnurl/lib');
const path = require('path');

const dummyServer = lnurl.createServer({
	listen: false,
	lightning: null,
	store: { backend: 'memory', config: { noWarning: true } },
});

const generalFailureRegEx = /getaddrinfo ENOTFOUND/i;

const badAuthRegEx = {
	'lnd': /verification failed|cannot determine data format|field data extends past end of buffer|fields out of order/i,
	'coinos': /Unauthorized/i,
	'lndhub': /bad auth/i,
	'lnpay': /Unauthorized|Wallet not found/i,
	'lntxbot': /bad auth/i,
	'opennode': /Invalid API key for request/i,
};

const goodAuthRegEx = {
	'lnbits': /Insufficient balance|is not reachable directly and all routehints were unusable/i,
};

module.exports = function(lightning) {
	try {
		const { backend } = lightning;
		const ln = dummyServer.prepareLightningBackend(lightning);
		const invoice = generatePaymentRequest(1);
		return ln.payInvoice(invoice).then(() => {
			return true;
		}).catch(error => {
			if (generalFailureRegEx.test(error.message)) {
				return false;
			}
			if (!_.isUndefined(badAuthRegEx[backend])) {
				if (!badAuthRegEx[backend].test(error.message)) {
					// Error message does not match bad auth pattern for this backend.
					// Consider the check passed.
					return true;
				}
			} else if (!_.isUndefined(goodAuthRegEx[backend])) {
				if (goodAuthRegEx[backend].test(error.message)) {
					// Error message matches good auth pattern for this backend.
					// Consider the check passed.
					return true;
				}
			}
			// Some other error occurred. Or unknown backend.
			// Consider the check failed.
			return false;
		});
	} catch (error) {
		return Promise.reject(error);
	}
};