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

const BigNumber = require('bignumber.js');

module.exports = function(amount, rate) {
	return (new BigNumber(amount))
			.dividedBy(rate)
			.times(1e8)
			.integerValue(BigNumber.ROUND_DOWN)
			.times(1000)
			.toString();
};
