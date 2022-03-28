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

const { tlsCheck } = require('lightning-backends');
const url = require('url');

module.exports = function(app) {

	const { config, debug } = app.custom;

	app.get('/admin/tls-check', function(req, res, next) {
		if (!req.query.hostname) {
			return res.status(400).json({ error: 'Missing "hostname"', status: 400 });
		}
		const { host, port } = url.parse(`https://${req.query.hostname}`);
		if (!host || !port) {
			return res.status(400).json({ error: 'Invalid hostname', status: 400 });
		}
		return tlsCheck(host, config.tlsCheck).then(result => {
			return res.status(200).json(result);
		}).catch(error => {
			debug.error(error);
			return res.status(400).json({ error: 'Connection failure', status: 400 });
		});
	});
};
