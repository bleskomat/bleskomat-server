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

const async = require('async');
const bcrypt = require('bcrypt');
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

const done = function(error, result) {
	rl.close();
	mutableStdout.muted = false;
	if (error) {
		console.error(error);
		process.exit(1);
	}
	if (result) {
		process.stdout.write(result);
	}
	process.exit();
};

const questions = [
	{
		name: 'saltRounds',
		label: 'Number of bcrypt salt rounds (default = 10)',
		defaultValue: 10,
		validate: function(value) {
			value = parseInt(value);
			if (!Number.isInteger(value)) {
				throw new Error('Must be an integer');
			}
		},
		process: function(value) {
			return parseInt(value);
		},
	},
	{
		name: 'password',
		label: 'Please enter the password to be hashed',
		muted: true,
	},
];

console.log('Use CTRL+C to cancel at any time');

let answers = {};
async.eachSeries(questions, (question, next) => {
	rl.question(`${question.label}: `, value => {
		value = value || question.defaultValue;
		if (question.validate) {
			try {
				question.validate(value);
			} catch (error) {
				return next(error);
			}
		}
		if (question.process) {
			value = question.process(value);
		}
		answers[question.name] = value;
		next();
	});
	mutableStdout.muted = question.muted === true;
}, error => {
	if (error) return done(error);
	const { password, saltRounds } = answers;
	return bcrypt.hash(password, saltRounds).then(hash => {
		const output = `\n\n${hash}\n`;
		done(null, output);
	}).catch(done);
});
