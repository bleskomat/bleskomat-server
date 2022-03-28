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

const assert = require('assert');

module.exports = {
	stringify: function(obj) {
		assert.strictEqual(typeof obj, 'object', 'Invalid argument ("obj"): Object expected');
		if (!obj || Object.keys(obj).length === 0) {
			return '';
		}
		// key=value pairs separated by new line characters.
		return Object.entries(obj).map(([key, value], index) => {
			if (typeof value === 'undefined' || value === null) {
				value = '';
			} else if (typeof value === 'boolean') {
				value = value === true ? '1' : '0';
			} else if (typeof value === 'object') {
				value = JSON.stringify(value);
			}
			return `${key}=${value}`;
		}).join('\n');
	},
};
