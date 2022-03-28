/*
	Copyright (C) 2020 Bleskomat s.r.o.

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

module.exports = function(app) {

	Object.assign(app.custom.lib, require('./lib'));

	(function() {
		// !! IMPORTANT !!
		// This uses an undocumented data structure of express.
		// So when upgrading the lnurl-node module, this might break.
		const { stack } = app._router;
		const index = stack.findIndex(item => {
			return item.name === 'notFound';
		});
		const before = stack.slice(0, index);
		const after = stack.slice(index);
		// Put the initial middleware/routes of lnurl-node server on the stack.
		app._router.stack = before;
		// Put new middleware/routes.
		app.custom.middleware = require('./middleware')(app)
		require('./routes')(app);
		// Finally, put the remaining middleware/routes from lnurl-node.
		app._router.stack = app._router.stack.concat(after);
	})();
};
