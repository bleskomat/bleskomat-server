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

const path = require('path');
const envFilePath = path.resolve(process.env.BLESKOMAT_SERVER_ENV_FILEPATH || '.env');

// https://github.com/motdotla/dotenv#usage
require('dotenv').config({
	override: true,
	path: envFilePath,
});

const config = require('./config');
let server = require('./lib/Server')(config);

const cleanup = function() {
	if (server) {
		return server.close().then(() => {
			server = null;
			process.exit(0);
		}).catch(error => {
			console.error(error);
			process.exit(1);
		});
	}
	process.exit(0);
};

process.on('uncaughtException', function(error, origin) {
	console.error(error);
});

['exit', 'SIGINT', 'SIGUSR1', 'SIGUSR2', 'SIGTERM'].forEach(event => {
	process.on(event, cleanup);
});
