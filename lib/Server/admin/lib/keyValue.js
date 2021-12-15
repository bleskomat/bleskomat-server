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

module.exports = {
	stringify: function(obj) {
		if (!_.isObject(obj)) {
			throw new Error('Invalid argument ("obj"): Object expected');
		}
		if (_.isEmpty(obj)) {
			return '';
		}
		// key=value pairs separated by new line characters.
		return _.map(obj, function(value, key) {
			if (_.isUndefined(value) || _.isNull(value)) {
				value = '';
			} else if (_.isBoolean(value)) {
				value = value === true ? '1' : '0';
			} else if (_.isObject(value)) {
				value = JSON.stringify(value);
			}
			return `${key}=${value}`;
		}).join('\n');
	},
};
