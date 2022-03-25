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

const { createSignedUrl } = require('lnurl');
const path = require('path');

// https://github.com/motdotla/dotenv#usage
require('dotenv').config({
	override: true,
	path: path.join(__dirname, '..', '.env'),
});

const config = require('../config');

let baseUrl;
if (config.lnurl.url) {
	baseUrl = `${config.lnurl.url}${config.lnurl.endpoint}`;
} else {
	baseUrl = `http://${config.lnurl.host}:${config.lnurl.port}${config.lnurl.endpoint}`;
}
const amount = process.argv[2] || null;
const fiatCurrency = process.argv[3] || null;
if (!amount || !fiatCurrency) {
	console.error('ERROR: Missing required argument(s)\nUsage: ./scripts/generateSignedUrl.js <amount> <fiatCurrency>');
	process.exit(1);
}
const apiKey = config.lnurl.auth.apiKeys[0];
if (!apiKey) {
	console.error('No API key configured');
	process.exit(1);
}
const tag = 'withdrawRequest';
const params = {
	minWithdrawable: amount,
	maxWithdrawable: amount,
	defaultDescription: '',
};
let options = {
	baseUrl,
	encode: false,
	shorten: true,
	overrides: {},
};
if (fiatCurrency) {
	options.overrides.f = fiatCurrency;
}
const signedUrl = createSignedUrl(apiKey, tag, params, options);
process.stdout.write(signedUrl);
process.exit(0);
