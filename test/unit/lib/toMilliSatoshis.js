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

const assert = require('assert');
const { toMilliSatoshis } = require('../../../lib');

describe('toMilliSatoshis(amount, rate)', function() {

	it('calculates msats correctly', function() {
		assert.strictEqual(toMilliSatoshis('1.00', '40000.00'), '2500000');
		assert.strictEqual(toMilliSatoshis('2.02', '39054.12'), '5172000');
		assert.strictEqual(toMilliSatoshis('0', '39900.00'), '0');
	});
});
