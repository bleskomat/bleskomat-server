# bleskomat-server

![Build Status](https://github.com/bleskomat/bleskomat-server/actions/workflows/tests.yml/badge.svg)

An open-source web server that facilitates Lightning Network payments on behalf of one or more Bleskomat ATMs. This project can be used with both the [Bleskomat DIY project](https://github.com/bleskomat/bleskomat-diy) as well as the commercial [Bleskomat ATM product](https://www.bleskomat.com).

* [Support](#support)
* [Usage](#usage)
	* [Usage with Nodejs](#usage-with-nodejs)
	* [Usage with Docker](#usage-with-docker)
	* [Usage with Docker Compose](#usage-with-docker-compose)
	* [Configuration Options](#configuration-options)
	* [How to create admin password hash](#how-to-create-admin-password-hash)
	* [How to generate API keys](#how-to-generate-api-keys)
* [Tests](#tests)
* [Docker Builds](#docker-builds)
* [Changelog](#changelog)
* [License](#license)
* [Trademark](#trademark)


## Support

Need some help? Join us in the official [Telegram group](https://t.me/bleskomat) or send us an email at [support@bleskomat.com](mailto:support@bleskomat.com) and we will try our best to respond in a reasonable time. If you have a feature request or bug to report, please [open an issue](https://github.com/bleskomat/bleskomat-server/issues) in this project repository.


## Usage

It's possible to run this project directly using nodejs, as a docker container, and with docker compose.


### Usage with Nodejs

To run the server, the following dependencies are required:

* [nodejs](https://nodejs.org/) - On Linux and Mac, nodejs can be installed via [nvm](https://github.com/creationix/nvm)

Download or clone this repository.

In the project directory, install node dependencies:
```bash
npm ci
```

To run the server:
```bash
npm start
```

To run the server while printing debug info:
```bash
DEBUG=bleskomat*,lnurl* npm start
```

The server runs with default configurations when none have been provided. To customize your server configuration, create a `.env` file in the root of the project directory. You can start by copying the `example.env` file:
```bash
cp example.env .env
```
Please refer to [Configuration Options](#configuration-options) for details about how to configure your server.


### Usage with Docker

To run the server:
```bash
docker run --rm -p 3000:3000 --name bleskomat-server bleskomat/bleskomat-server
```

To run the server while printing debug info:
```bash
docker run --rm -p 3000:3000 --name bleskomat-server -e DEBUG='bleskomat*,lnurl*' bleskomat/bleskomat-server
```

Customize the server configuration by passing environment variables when running the docker container:
```bash
docker run --rm -p 3000:3000 --name bleskomat-server -e DEBUG='bleskomat*,lnurl*' \
	-e BLESKOMAT_SERVER_HOST='0.0.0.0' \
	-e BLESKOMAT_SERVER_PORT='3000' \
	-e BLESKOMAT_SERVER_ENDPOINT='/u' \
	-e BLESKOMAT_SERVER_AUTH_API_KEYS='[]' \
	-e BLESKOMAT_SERVER_LIGHTNING='{"backend":"dummy","config":{}}' \
	-e BLESKOMAT_SERVER_STORE='{"backend":"memory","config":{}}' bleskomat/bleskomat-server
```
Please refer to [Configuration Options](#configuration-options) for details about how to configure your server.


### Usage with Docker Compose

See the [examples/docker-compose](https://github.com/bleskomat/bleskomat-server/blob/master/examples/docker-compose) directory for example usage.

Please refer to [Configuration Options](#configuration-options) for details about how to configure your server.


### Configuration Options

Below is a list of configuration options for the bleskomat server:
* `BLESKOMAT_SERVER_HOST` - The host on which the HTTP server listener will be bound.
* `BLESKOMAT_SERVER_PORT` - The port on which the HTTP server will listen.
* `BLESKOMAT_SERVER_URL` - The publicly accessible URL of the web server. This should __not__ include the endpoint. Example - `https://your-domain.com`
* `BLESKOMAT_SERVER_ENDPOINT` - The path of the LNURL route. The default is `/u`.
* `BLESKOMAT_SERVER_AUTH_API_KEYS` - An array of API keys that are authorized to create signed LNURLs for the server. See [How to generate API keys](#how-to-generate-api-keys)
* `BLESKOMAT_SERVER_LIGHTNING` - The Lightning Network backend configuration. Please refer to [Lightning Backend Configuration Options](https://github.com/chill117/lnurl-node#lightning-backend-configuration-options) for details.
* `BLESKOMAT_SERVER_STORE` - The data store configuration. Please refer to [Configuring Data Store](https://github.com/chill117/lnurl-node#configuring-data-store) for details.
* `BLESKOMAT_SERVER_COINRATES_DEFAULTS_PROVIDER` - The default exchange rates provider
* `BLESKOMAT_SERVER_ADMIN_WEB` - Whether or not to enable web-based admin interface. This is disabled by default.
	* To enable, set equal to `1` or `true`
	* With any other value, the admin interface will be disabled.
* `BLESKOMAT_SERVER_ADMIN_PASSWORD` - Hashed password which is used to authenticate user sessions in the web-based admin interface. See [How to create admin password hash](#how-to-create-admin-password-hash).
* `BLESKOMAT_SERVER_ADMIN_PASSWORD_PLAINTEXT` - Plaintext password which is used to authenticate user sessions in the web-based admin interface. Use of this environment variable is discouraged. It is more secure to pass the hashed password instead - see `BLESKOMAT_SERVER_ADMIN_PASSWORD` above.
* `BLESKOMAT_SERVER_ADMIN_SESSION` - Stringified JSON object containing configuration options for an instance of the [express-session](https://github.com/expressjs/session#api) middleware.
* `BLESKOMAT_SERVER_ADMIN_SCRYPT` - Stringified JSON object containing configuration options for [crypto.scrypt](https://nodejs.org/docs/latest-v12.x/api/crypto.html#crypto_crypto_scrypt_password_salt_keylen_options_callback).
* `BLESKOMAT_SERVER_TORSOCKSPROXY` - The hostname of the TOR socks proxy. Used when connecting to an LN backend behind TOR hidden service. Default value is `127.0.0.1:9050`


### How to create admin password hash

A utility script is included with this project which can generate a hash of your admin password. Run it as follows:
```bash
npm run generate:adminPasswordHash
```

Using the docker image:
```bash
docker run --rm bleskomat/bleskomat-server npm run generate:adminPasswordHash -- <PASSWORD>
```

There aren't any restrictions on the length or character set of the password. But a long (20 or more characters), alphanumeric password is recommended.


### How to generate API keys

Using nodejs:
```bash
./node_modules/.bin/lnurl generateApiKey
```

Using the docker image:
```bash
docker run --rm bleskomat/bleskomat-server ./node_modules/.bin/lnurl generateApiKey
```

See [Generating a new API key](https://github.com/chill117/lnurl-node#generating-a-new-api-key) for further details.


## Tests

This project includes an automated regression test suite. To run the tests:
```bash
npm test
```
To provide custom environment variables to the tests, create `test/.env` by copying `test/example.env`:
```bash
cp test/example.env test/.env
```
See [Configuration Options](#configuration-options).


## Docker Builds

For configuring your system to support cross-platform docker builds, see [Building Multi-Architecture Docker Images With Buildx](https://medium.com/@artur.klauser/building-multi-architecture-docker-images-with-buildx-27d80f7e2408).

To build and push docker images:
```bash
docker buildx build --platform linux/arm64,linux/amd64 \
	--tag bleskomat/bleskomat-server:1.3.3 \
	--tag bleskomat/bleskomat-server:latest \
	--output "type=registry" .
```
This requires that you have already logged-in to docker with `docker login`.


## Changelog

See [CHANGELOG.md](https://github.com/bleskomat/bleskomat-server/blob/master/CHANGELOG.md)


## License

The project is licensed under the [GNU Affero General Public License v3 (AGPL-3.0)](https://tldrlegal.com/license/gnu-affero-general-public-license-v3-(agpl-3.0)):
> The AGPL license differs from the other GNU licenses in that it was built for network software. You can distribute modified versions if you keep track of the changes and the date you made them. As per usual with GNU licenses, you must license derivatives under AGPL. It provides the same restrictions and freedoms as the GPLv3 but with an additional clause which makes it so that source code must be distributed along with web publication. Since web sites and services are never distributed in the traditional sense, the AGPL is the GPL of the web.


## Trademark

"Bleskomat" is a registered trademark. You are welcome to hack, fork, build, and use the source code and instructions found in this repository. However, the right to use the name "Bleskomat" with any commercial products or services is withheld and reserved for the trademark owner.
