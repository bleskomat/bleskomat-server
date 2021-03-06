# Changelog

* v1.3.4:
	* Date store of lnurl-node will now wait for database connection or fail after timeout (30 seconds by default)
* v1.3.3:
	* Build docker image w/ default data store dependencies (knex, pg)
	* Optimize Dockerfile
	* Remove docker entrypoint file which was used to install data store deps at run-time - this is no longer done.
* v1.3.2:
	* Fixes for run via docker - e.g. w/ data store and custom .env file path
* v1.3.1:
	* Fix for lnd backend check
* v1.3.0:
	* Can now provide password for admin interface as hash or plaintext via environment variable
	* Added support for LN backends with custom endpoint and/or behind TOR hidden service
	* Improved error-handling for LN backend checks
* v1.2.0:
	* New, optional admin interface
	* More exchange rate providers via coin-rates module
	* Upgraded dependencies
* v1.1.0:
	* Added helper script to generate signed URLs
	* Improvements to docker build
* v1.0.0:
	* Initial release
