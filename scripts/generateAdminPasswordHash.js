/*
	Copyright (C) 2020 Bleskomat s.r.o.

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

const scrypt = require('@bleskomat/scrypt');
const path = require('path');

// https://github.com/motdotla/dotenv#usage
require('dotenv').config({
	override: true,
	path: path.join(__dirname, '..', '.env'),
});

const config = require('../config');

const createHash = function(password) {
	const { keylen, options, saltBytes } = config.admin.scrypt;
	const salt = scrypt.generateSalt(saltBytes);
	return scrypt.hashSync(password, salt, keylen, options);
};

if (passwordArg) {
	// Password passed as an argument to this script.
	const hash = createHash(passwordArg);
	process.stdout.write(`${hash}\n`);
	process.exit();
}

// Ask the script user to provide the password via CLI prompt.

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

rl.question(`Please enter the password to be hashed: \n`, password => {
	rl.close();
	mutableStdout.muted = false;
	if (!password) {
		console.error('ERROR: An empty-string password is not allowed');
		process.exit(1);
	}
	let hash;
	try { hash = createHash(password); } catch (error) {
		console.error(error);
		process.exit(1);
	}
	process.stdout.write(`${hash}\n`);
});

mutableStdout.muted = true;
