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
const fs = require('fs').promises;
const path = require('path');

describe('config', function() {

	let server;
	afterEach(function() {
		if (server) return server.close().then(() => {
			server = null;
		});
	});

	it('relative .env file path', function() {
		let config = this.helpers.prepareConfig();
		const relativePath = './test/tmp/.env';
		const absolutePath = path.resolve(relativePath);
		config.env.filePath = relativePath;
		return this.helpers.createServer(config).then(result => {
			server = result;
			expect(config.env.filePath).to.equal(absolutePath);
		});
	});

	it('.env file already exists', function() {
		let config = this.helpers.prepareConfig();
		const filePath = path.resolve('./test/tmp/.env');
		config.env.filePath = filePath;
		return fs.writeFile(filePath, 'TEST=1').then(() => {
			return this.helpers.createServer(config).then(result => {
				server = result;
			})
		}).then(() => {
			return fs.readFile(filePath).then(contents => {
				expect(contents.toString()).to.equal('TEST=1');
			});
		});
	});

	it('.env file directory does not exist', function() {
		let config = this.helpers.prepareConfig();
		config.env.filePath = path.join(this.helpers.tmpDir, 'does-not-exist', '.env');
		return this.helpers.createServer(config).then(result => {
			server = result;
			throw new Error('Expected an error');
		}).catch(error => {
			expect(error.message).to.contain('no such file or directory, stat');
		});
	});

	it('.env file directory exists, .env file does not exist', function() {
		let config = this.helpers.prepareConfig();
		config.env.filePath = path.join(this.helpers.tmpDir, '.env');
		return this.helpers.createServer(config).then(result => {
			server = result;
		});
	});

	it('.env file directory exists, .env file does not exist, cannot write', function() {
		const envDir = path.join(this.helpers.tmpDir, 'not-writable');
		return fs.mkdir(envDir).then(() => {
			return fs.chmod(envDir, 0o400);
		}).then(() => {
			let config = this.helpers.prepareConfig();
			config.env.filePath = path.join(envDir, '.env');
			return this.helpers.createServer(config).then(result => {
				server = result;
				throw new Error('Expected an error');
			}).catch(error => {
				expect(error.message).to.contain('EACCES: permission denied, open');
			});
		});
	});
});
