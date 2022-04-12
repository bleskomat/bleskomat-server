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

document.addEventListener('DOMContentLoaded', function() {

	var preventDefault = function(evt) {
		if (evt.preventDefault) { 
			evt.preventDefault();
		} else {
			evt.returnValue = false; 
		}
	};

	document.querySelectorAll('.form-field-help-toggle').forEach(function(formHelpToggle) {
		formHelpToggle.addEventListener('click', function(evt) {
			preventDefault(evt);
			var row = evt.target.parentElement;
			while (row && !row.classList.contains('form-row')) {
				row = row.parentElement;
			}
			if (row.classList.contains('form-row')) {
				var help = row.querySelector('.form-field-help');
				if (help) {
					if (help.classList.contains('visible')) {
						help.classList.remove('visible');
					} else {
						help.classList.add('visible');
					}
				}
			}
		});
	});

	(function() {

		if (!document.querySelector('body.template-overview')) return;

		var apiKeys = {
			deleteButtons: document.querySelectorAll('.box.apiKeys .button.delete'),
		};

		apiKeys.deleteButtons.forEach(function(deleteButton) {
			deleteButton.addEventListener('click', function(evt) {
				if (!confirm('Are you sure you want to delete this API key?')) {
					preventDefault(evt);
				}
			});
		});

	})();

});
