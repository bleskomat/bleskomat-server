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

const _ = require('underscore');
const { generateApiKey } = require('lnurl');
const { Readable } = require('stream');

module.exports = function(app) {

	const { config, lib, lnurlServer } = app.custom;
	const { env, keyValue } = lib;

	app.get('/admin/api-keys/add',
		function(req, res, next) {
			const apiKey = generateApiKey({
				encoding: 'hex',
				numBytes: { id: 10, key: 32 },
			});
			config.lnurl.auth.apiKeys.push(apiKey);
			return env.save(config).then(() => {
				return res.redirect('/admin/overview');
			});
		}
	);

	app.get('/admin/api-keys/:id/delete',
		function(req, res, next) {
			const { id } = req.params;
			config.lnurl.auth.apiKeys = _.filter(config.lnurl.auth.apiKeys, apiKey => {
				return apiKey.id !== id;
			});
			return env.save(config).then(() => {
				return res.redirect('/admin/overview');
			});
		}
	);

	app.get('/admin/api-keys/:id/download-config',
		function(req, res, next) {
			const { id } = req.params;
			const apiKey = _.findWhere(config.lnurl.auth.apiKeys, { id });
			if (!apiKey) {
				return res.status(404).render('message', {
					title: 'Not Found',
					message: `Cannot download configuration file because API Key with ID "${id}" was not found.`,
				});
			}
			const data = {
				'apiKey.id': apiKey.id,
				'apiKey.key': apiKey.key,
				'apiKey.encoding': apiKey.encoding,
				'callbackUrl': lnurlServer.getCallbackUrl(),
			};
			const output = keyValue.stringify(data);
			const readable = Readable.from([output]);
			res.setHeader('Content-disposition', 'attachment; filename=bleskomat.conf');
			res.setHeader('Content-type', 'text/plain');
			return readable.pipe(res);
		}
	);
};
