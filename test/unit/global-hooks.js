const fs = require('fs').promises;
const helpers = require('../helpers');

before(function() {
	// Make helpers available inside tests and hooks.
	this.helpers = helpers;
});

before(function() {
	return this.helpers.removeDir(this.helpers.tmpDir);
});

before(function() {
	return fs.mkdir(this.helpers.tmpDir, { recursive: true });
});

after(function() {
	return this.helpers.removeDir(this.helpers.tmpDir);
});
