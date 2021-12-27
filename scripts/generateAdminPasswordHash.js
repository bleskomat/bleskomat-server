/*
	Copyright (C) 2020 Samotari (Charles Hill, Carlos Garcia Ortiz)

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.	See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.	If not, see <http://www.gnu.org/licenses/>.
*/

const passwordArg = process.argv[2] || null;

const scrypt = require('../lib/Server/admin/lib/scrypt');
const path = require('path');

// https://github.com/motdotla/dotenv#usage
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = require('../config');

const done = function(error, output) {
	if (error) {
		console.error(error);
		process.exit(1);
	}
	if (output) {
		process.stdout.write(output);
	}
	process.exit();
};

const doHash = function(password) {
	const { keylen, options, saltBytes } = config.admin.scrypt;
	const salt = scrypt.generateSalt(saltBytes);
	return scrypt.hash(password, salt, keylen, options).then(hash => {
		const output = `\n\n${hash}\n`;
		done(null, output);
	}).catch(done);
};

if (passwordArg) {
	return doHash(passwordArg);
}

const readline = require('readline');
const { Writable } = require('stream');

let mutableStdout = new Writable({
	write: function(chunk, encoding, callback) {
		if (!this.muted) {
			process.stdout.write(chunk, encoding);
		}
		callback();
	}
});

mutableStdout.muted = false;

const rl = readline.createInterface({
	input: process.stdin,
	output: mutableStdout,
	terminal: true
});

console.log('Use CTRL+C to cancel at any time');

rl.question(`Please enter the password to be hashed: `, password => {
	rl.close();
	mutableStdout.muted = false;
	if (!password) {
		return done(new Error('An empty-string password is not allowed'));
	}
	return doHash(password);
});

mutableStdout.muted = true;
