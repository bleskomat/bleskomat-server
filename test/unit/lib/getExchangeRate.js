const { expect } = require('chai');
const { getExchangeRate } = require('../../../lib');

describe('getExchangeRate(options)', function() {

	it('can get exchange rate from provider', function() {
		return getExchangeRate({
			from: 'BTC',
			to: 'EUR',
		}).then(result => {
			expect(result).be.a('string');
			const rate = Number(result);
			expect(Number.isNaN(rate)).to.equal(false);
			expect(Number.isFinite(rate)).to.equal(true);
		});
	});
});
