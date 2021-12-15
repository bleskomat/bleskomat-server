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

	(function() {

		if (!document.querySelector('body.template-settings')) return;

		var fields = {
			'backend': document.querySelector('select[name="backend"]'),
			'lnd[hostname]': document.querySelector('input[name="lnd[hostname]"]'),
			'lnd[cert]': document.querySelector('textarea[name="lnd[cert]"]'),
			'lnd[fingerprint]': document.querySelector('input[name="lnd[fingerprint]"]'),
			'lnd[fingerprint256]': document.querySelector('input[name="lnd[fingerprint256]"]'),
		};

		if (!fields['backend']) return;

		var formErrors = document.querySelector('.form-errors');

		fields['backend'] && fields['backend'].addEventListener('change', function(evt) {
			showGroup(fields['backend'].value);
			clearTlsCheckError();
		});

		var groups = document.querySelectorAll('.form-group');
		var showGroup = function(name) {
			groups.forEach(function(group) {
				group.classList.remove('visible');
				if (group.classList.contains('form-group--' + name)) {
					group.classList.add('visible');
				}
			});
		};

		showGroup(fields['backend'].value);

		fields['lnd[hostname]'] && fields['lnd[hostname]'].addEventListener('change', function(evt) {
			doLndTlsCheck();
		});

		var showTlsCheckError = function(hostname, errorMessage) {
			var message = 'Failed TLS check for "' + hostname + '": ' + errorMessage;
			var newError = document.createElement('p');
			newError.textContent = message;
			newError.classList.add('tls-check');
			formErrors && formErrors.appendChild(newError);
		};

		var clearTlsCheckError = function() {
			if (formErrors) {
				var tlsError = formErrors.querySelector('.tls-check');
				tlsError && tlsError.parentNode.removeChild(tlsError);
			}
		};

		var doLndTlsCheck = function() {
			clearTlsCheckError();
			var hostname = fields['lnd[hostname]'].value;
			if (hostname) {
				var url = '/admin/tls-check?hostname=' + encodeURIComponent(hostname);
				fetch(url, {
					method: 'GET',
				}).then(function(response) {
					return response.json().then(function(data) {
						if (data.error) {
							showTlsCheckError(hostname, data.error);
							resetLndCertFields();
						} else {
							fields['lnd[cert]'] && (fields['lnd[cert]'].value = data.pem);
							fields['lnd[fingerprint]'] && (fields['lnd[fingerprint]'].value = data.fingerprint);
							fields['lnd[fingerprint256]'] && (fields['lnd[fingerprint256]'].value = data.fingerprint256);
						}
					});
				}).catch(function() {
					showTlsCheckError(hostname, 'An unexpected error occurred');
					resetLndCertFields();
				});
			} else {
				resetLndCertFields();
			}
		};

		var resetLndCertFields = function() {
			fields['lnd[cert]'] && (fields['lnd[cert]'].value = '');
			fields['lnd[fingerprint]'] && (fields['lnd[fingerprint]'].value = '');
			fields['lnd[fingerprint256]'] && (fields['lnd[fingerprint256]'].value = '');
		};

		if (fields['backend'].value === 'lnd' && !fields['lnd[cert]'].value) {
			doLndTlsCheck();
		}
	})();

});
