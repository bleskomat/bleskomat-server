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

module.exports = function(app) {

	const { config, debug, lib } = app.custom;
	const { getTlsCertAndFingerprint } = lib;

	app.get('/admin/tls-check', function(req, res, next) {
		if (!req.query.hostname) {
			return res.status(400).json({ error: 'Missing "hostname"', status: 400 });
		}
		const { hostname } = req.query;
		const parsedUrl = url.parse(`https://${hostname}`);
		if (!parsedUrl.hostname || !parsedUrl.port) {
			return res.status(400).json({ error: 'Unable to parse hostname', status: 400 });
		}
		return getTlsCertAndFingerprint(hostname, config.getTlsCertAndFingerprint).then(result => {
			return res.status(200).json(result);
		}).catch(error => {
			debug.error(error);
			return res.status(400).json({ error: 'Connection failure', status: 400 });
		});
	});
};
