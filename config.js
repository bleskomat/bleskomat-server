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

const path = require('path');

// Optionally define environment variables by placing a .env file in the root of the project directory.
// For details:
// https://github.com/motdotla/dotenv#usage
require('dotenv').config();

let config = {
	lnurl: {
		host: process.env.BLESKOMAT_SERVER_HOST || '0.0.0.0',
		port: parseInt(process.env.BLESKOMAT_SERVER_PORT || 3000),
		url: process.env.BLESKOMAT_SERVER_URL || null,
		endpoint: process.env.BLESKOMAT_SERVER_ENDPOINT || '/u',
		auth: {
			apiKeys: JSON.parse(process.env.BLESKOMAT_SERVER_AUTH_API_KEYS || '[]'),
		},
		lightning: JSON.parse(process.env.BLESKOMAT_SERVER_LIGHTNING || '{"backend":"dummy","config":{}}'),
		store: JSON.parse(process.env.BLESKOMAT_SERVER_STORE || '{"backend":"memory","config":{}}'),
	},
};

if (!config.lnurl.url) {
	const { endpoint, host, port } = config.lnurl;
	config.lnurl.url = `http://${host}:${port}`;
}

module.exports = config;
