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
