# bleskomat-server

An open-source web server that facilitates Lightning Network payments on behalf of one or more Bleskomat ATMs. This project can be used with both the [Bleskomat DIY project](https://github.com/samotari/bleskomat) as well as the commercial [Bleskomat ATM product](https://www.bleskomat.com).

* [Usage](#usage)
* [Notes](#notes)
* [License](#license)
* [Trademark](#trademark)


## Usage

It's possible to run the server in a number of ways:
* [Usage with Nodejs](#usage-with-nodejs)
* [Usage with Docker](#usage-with-docker)
* [Usage with Docker Compose](#usage-with-docker-compose)


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
DEBUG=lnurl* npm start
```

The server runs with default configurations when none have been provided. To customize your server configuration, create a `.env` file in the root of the project directory. You can start by copying the `example.env` file:
```bash
cp example.env .env
```
Please refer to [Configuration Options](#configuration-options) for details about how to configure your server.


### Usage with Docker

To run the server:
```bash
docker run -p 3000:3000 --name bleskomat-server --detach bleskomat/bleskomat-server
```

To run the server while printing debug info:
```bash
docker run -p 3000:3000 --name bleskomat-server --detach -e DEBUG='lnurl*' bleskomat/bleskomat-server
```

Customize the server configuration by passing environment variables when running the docker container:
```bash
docker run -p 3000:3000 --name bleskomat-server --detach -e DEBUG='lnurl*' \
	-e BLESKOMAT_SERVER_HOST='0.0.0.0' \
	-e BLESKOMAT_SERVER_PORT='3000' \
	-e BLESKOMAT_SERVER_URL='https://DOMAINNAME' \
	-e BLESKOMAT_SERVER_ENDPOINT='/u' \
	-e BLESKOMAT_SERVER_AUTH_API_KEYS='[]' \
	-e BLESKOMAT_SERVER_LIGHTNING='{"backend":"dummy","config":{}}' \
	-e BLESKOMAT_SERVER_STORE='{"backend":"memory","config":{}}' bleskomat/bleskomat-server
```
Please refer to [Configuration Options](#configuration-options) for details about how to configure your server.


### Usage with Docker Compose

See the [examples/docker-compose](https://github.com/samotari/bleskomat-server/blob/master/examples/docker-compose) directory for example usage.

Please refer to [Configuration Options](#configuration-options) for details about how to configure your server.


## Configuration Options

Below is a list of configuration options for the bleskomat server:
* `BLESKOMAT_SERVER_HOST` - The host on which the HTTP server listener will be bound.
* `BLESKOMAT_SERVER_PORT` - The port on which the HTTP server will listen.
* `BLESKOMAT_SERVER_URL` - The publicly accessible URL of the web server. This should __not__ include the endpoint. Example - `https://your-domain.com`
* `BLESKOMAT_SERVER_ENDPOINT` - The path of the LNURL route. The default is `/u`.
* `BLESKOMAT_SERVER_AUTH_API_KEYS` - An array of API keys that are authorized to create signed LNURLs for the server. See [How to generate API keys](#how-to-generate-api-keys)
* `BLESKOMAT_SERVER_LIGHTNING` - The Lightning Network backend configuration. Please refer to [Lightning Backend Configuration Options](https://github.com/chill117/lnurl-node#lightning-backend-configuration-options) for details.
* `BLESKOMAT_SERVER_STORE` - The data store configuration. Please refer to [Configuring Data Store](https://github.com/chill117/lnurl-node#configuring-data-store) for details.


### How to generate API keys

Using nodejs:
```bash
./node_modules/.bin/lnurl generateApiKey
```

Using the docker image:
```bash
docker run bleskomat/bleskomat-server ./node_modules/.bin/lnurl generateApiKey
```

See [Generating a new API key](https://github.com/chill117/lnurl-node#generating-a-new-api-key) for further details.


## Notes

* It is strongly recommended to only serve LNURL-related requests via HTTPS.
* Exchange rates are queried using Coinbase's [/v2/exchange-rates](https://developers.coinbase.com/api/v2#exchange-rates) API end-point. The function that does this is defined in [./lib/getExchangeRate.js](https://github.com/samotari/bleskomat-server/blob/master/lib/getExchangeRate.js). If you prefer to use a different provider, that is the place to make your changes.


## License

The project is licensed under the [GNU Affero General Public License v3 (AGPL-3.0)](https://tldrlegal.com/license/gnu-affero-general-public-license-v3-(agpl-3.0)):
> The AGPL license differs from the other GNU licenses in that it was built for network software. You can distribute modified versions if you keep track of the changes and the date you made them. As per usual with GNU licenses, you must license derivatives under AGPL. It provides the same restrictions and freedoms as the GPLv3 but with an additional clause which makes it so that source code must be distributed along with web publication. Since web sites and services are never distributed in the traditional sense, the AGPL is the GPL of the web.


## Trademark

"Bleskomat" is a registered trademark. You are welcome to hack, fork, build, and use the source code and instructions found in this repository. However, the right to use the name "Bleskomat" with any commercial products or services is withheld and reserved for the trademark owner.
