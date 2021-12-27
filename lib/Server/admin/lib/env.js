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
const fs = require('fs').promises;
const keyValue = require('./keyValue');

module.exports = {
	save: function(config) {
		if (!_.isObject(config)) {
			return Promise.reject(new Error('Invalid argument ("config"): Object expected'));
		}
		const { filePath } = config.env;
		return this.saveToFile(filePath, config);
	},
	saveToFile: function(filePath, config) {
		if (!_.isString(filePath)) {
			return Promise.reject(new Error('Invalid argument ("filePath"): String expected'));
		}
		if (!_.isObject(config)) {
			return Promise.reject(new Error('Invalid argument ("config"): Object expected'));
		}
		const contents = this.configToEnv(config);
		return fs.writeFile(filePath, contents);
	},
	configToEnv: function(config) {
		return keyValue.stringify({
			BLESKOMAT_SERVER_HOST: config.lnurl.host,
			BLESKOMAT_SERVER_PORT: config.lnurl.port,
			BLESKOMAT_SERVER_URL: config.lnurl.url,
			BLESKOMAT_SERVER_ENDPOINT: config.lnurl.endpoint,
			BLESKOMAT_SERVER_AUTH_API_KEYS: config.lnurl.auth.apiKeys,
			BLESKOMAT_SERVER_LIGHTNING: config.lnurl.lightning,
			BLESKOMAT_SERVER_STORE: config.lnurl.store,
			BLESKOMAT_SERVER_COINRATES_DEFAULTS_PROVIDER: config.coinRates.defaults.provider,
			BLESKOMAT_SERVER_ADMIN_WEB: config.admin.web,
			BLESKOMAT_SERVER_ADMIN_PASSWORD: config.admin.password,
			BLESKOMAT_SERVER_ADMIN_SESSION: config.admin.session,
			BLESKOMAT_SERVER_ADMIN_SCRYPT: config.admin.scrypt,
			BLESKOMAT_SERVER_ENV_FILEPATH: config.env.filePath,
		});
	},
};
