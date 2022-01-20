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

const url = require('url');
const { ValidationError } = require('form');

module.exports = [
	{
		name: 'lnd',
		label: 'Lightning Network Daemon (lnd)',
		inputs: [
			{
				name: 'baseUrl',
				label: 'Base URL',
				help: 'Base URL of your lnd node\'s REST API. Onion addresses are supported.',
				type: 'text',
				placeholder: 'https://127.0.0.1:8080',
				default: '',
				required: true,
				validate: function(value) {
					if (value) {
						const parsedUrl = url.parse(value);
						if (!parsedUrl) {
							throw new ValidationError('"Base URL" must be a valid URL - e.g. https://127.0.0.1:8080');
						}
						const isOnionAddress = parsedUrl.hostname.substr(-6) === '.onion';
						if (!isOnionAddress && parsedUrl.protocol !== 'https:') {
							throw new ValidationError('Except in the case of onion addresses, "Base URL" must use the https protocol.');
						}
					}
				},
			},
			{
				name: 'cert',
				label: 'TLS Certificate',
				help: 'Automatically retrieved from service at the URL provided above. Please check this against your lnd\'s tls.cert file.',
				type: 'textarea',
				default: '',
				readonly: true,
				required: function(data) {
					const { baseUrl } = data;
					return baseUrl && baseUrl.split('://')[0] === 'https';
				},
				rows: 4,
			},
			{
				name: 'fingerprint',
				label: 'Fingerprint (sha1)',
				type: 'text',
				default: '',
				disabled: true,
			},
			{
				name: 'fingerprint256',
				label: 'Fingerprint (sha256)',
				type: 'text',
				default: '',
				disabled: true,
			},
			{
				name: 'macaroon',
				label: 'Macaroon (hex)',
				help: 'Use `xxd -c 10000 -p -u ./admin.macaroon` to print a macaroon file as hexadecimal. The macaroon provided must have permission to pay invoices.',
				type: 'textarea',
				placeholder: '02EF72..',
				default: '',
				rows: 4,
				required: true,
			},
		],
	},
	{
		name: 'coinos',
		inputs: [
			{
				name: 'baseUrl',
				label: 'Base URL',
				help: 'Keep the default value unless you are hosting your own instance.',
				type: 'text',
				placeholder: 'https://coinos.io',
				default: 'https://coinos.io',
				required: true,
			},
			{
				name: 'jwt',
				label: 'JWT Auth Token',
				help: 'From your coinos wallet, go to "Settings" then "Auth keys" to view the "JWT Auth Token"',
				type: 'text',
				placeholder: 'xxx',
				default: '',
				required: true,
			},
		],
	},
	{
		name: 'lnbits',
		inputs: [
			{
				name: 'baseUrl',
				label: 'Base URL',
				help: 'Keep the default value unless you are hosting your own instance.',
				type: 'text',
				placeholder: 'https://legend.lnbits.com',
				default: 'https://legend.lnbits.com',
				required: true,
			},
			{
				name: 'adminKey',
				label: 'Admin Key',
				help: 'From an account page, open "API info" to view the "Admin key"',
				type: 'text',
				placeholder: 'xxx',
				default: '',
				required: true,
			},
		],
	},
	{
		name: 'lndhub',
		inputs: [
			{
				name: 'secret',
				label: 'Secret',
				help: 'If using BlueWallet, go to wallet then "Export/Backup" to view the secret',
				type: 'text',
				placeholder: 'lndhub://xxx:xxx@@https://lndhub.io',
				default: '',
				required: true,
			},
		],
	},
	{
		name: 'lnpay',
		inputs: [
			{
				name: 'hostname',
				label: 'Hostname',
				type: 'text',
				default: 'lnpay.co',
				required: true,
			},
			{
				name: 'apiKey',
				label: 'API Key',
				type: 'text',
				placeholder: 'sak_xxx',
				default: '',
				required: true,
			},
			{
				name: 'walletKey',
				label: 'Wallet Key',
				type: 'text',
				placeholder: 'waka_xxx',
				default: '',
				required: true,
			},
		],
	},
	{
		name: 'lntxbot',
		inputs: [
			{
				name: 'hostname',
				label: 'Hostname',
				type: 'text',
				default: 'lntxbot.com',
				required: true,
			},
			{
				name: 'adminKey',
				label: 'Admin Key',
				help: 'Open Telegram, open the chat with LNTXBOT, send message to the bot "/api_full"',
				type: 'text',
				placeholder: 'xxx',
				default: '',
				required: true,
			},
		],
	},
	{
		name: 'opennode',
		inputs: [
			{
				name: 'hostname',
				label: 'Hostname',
				type: 'text',
				default: 'api.opennode.co',
				required: true,
			},
			{
				name: 'apiKey',
				label: 'API Key',
				type: 'text',
				placeholder: 'xxx',
				default: '',
				required: true,
			},
		],
	},
];
