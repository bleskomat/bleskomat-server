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
const { expect } = require('chai');
const { toMilliSatoshis } = require('../../../lib');

describe('toMilliSatoshis(amount, rate)', function() {

	const tests = [
		{
			args: {
				amount: '1.00',
				rate: '40000.00',
			},
			expected: '2500000',
		},
		{
			args: {
				amount: '2.02',
				rate: '39054.12',
			},
			expected: '5172000',
		},
		{
			args: {
				amount: '0',
				rate: '39900.00',
			},
			expected: '0',
		},
	];

	_.each(tests, test => {
		if (!test.description) {
			test.description = JSON.stringify(test.args);
		}
		it(test.description, function() {
			const args = _.values(test.args);
			const result = toMilliSatoshis.apply(undefined, args);
			expect(result).to.equal(test.expected);
		});
	});
});
