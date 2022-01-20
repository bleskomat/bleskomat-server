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

const { expect } = require('chai');

describe('admin', function() {

	let server;
	afterEach(function() {
		if (server) return server.close().then(() => {
			server = null;
		});
	});

	describe('config', function() {

		it('enabled without password', function() {
			let config = this.helpers.prepareConfig();
			config.admin.web = true;
			config.admin.password = '';
			config.lnurl.lightning.backend = 'coinos';
			config.lnurl.lightning.config = { jwt: 'xxx' };
			return this.helpers.createServer(config).then(result => {
				server = result;
				throw new Error('Expected an error');
			}).catch(error => {
				expect(error.message).to.equal('A password is required to use the admin interface with a configured Lightning backend');
			});
		});

		it('with plaintext password', function() {
			let config = this.helpers.prepareConfig();
			config.admin.web = true;
			config.admin.password = '';
			config.lnurl.lightning.backend = 'coinos';
			config.lnurl.lightning.config = { jwt: 'xxx' };
			return this.helpers.createServer(config).then(result => {
				server = result;
				throw new Error('Expected an error');
			}).catch(error => {
				expect(error.message).to.equal('A password is required to use the admin interface with a configured Lightning backend');
			});
		});
	});
});
