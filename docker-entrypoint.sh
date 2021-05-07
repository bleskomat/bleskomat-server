#!/usr/bin/env bash

# jq is used to parse configurations passed via environment variables:
# https://stedolan.github.io/jq/

declare -A OPTIONAL_DEPENDENCIES=(
	[knex]="knex@0.95.x"
	[mysql]="mysql@2.18.x"
	[pg]="pg@8.6.x"
	[sqlite3]="sqlite3@5.0.x"
)

install_store_optional_dependencies() {
	if [ ! -z "${BLESKOMAT_SERVER_STORE}" ]; then
		STORE_BACKEND=$(echo -n "${BLESKOMAT_SERVER_STORE}" | jq -r '.backend');
		if [ "${STORE_BACKEND}" = "knex" ]; then
			KNEX_CLIENT=$(echo -n "${BLESKOMAT_SERVER_STORE}" | jq -r '.config.client');
			if [[ "${KNEX_CLIENT}" = "pg" || "${KNEX_CLIENT}" = "postgres" ]]; then
				npm list ${OPTIONAL_DEPENDENCIES[pg]} || npm install ${OPTIONAL_DEPENDENCIES[pg]}
			elif [ "${KNEX_CLIENT}" = "mysql" ]; then
				npm list ${OPTIONAL_DEPENDENCIES[mysql]} || npm install ${OPTIONAL_DEPENDENCIES[mysql]}
			elif [ "${KNEX_CLIENT}" = "sqlite3" ]; then
				npm list ${OPTIONAL_DEPENDENCIES[sqlite3]} || npm install ${OPTIONAL_DEPENDENCIES[sqlite3]}
			else
				echo "Unsupported knex client: \"${KNEX_CLIENT}\". Please refer to the following list of supported clients: \"mysql\", \"postgres\", \"sqlite3\"."
				exit 1
			fi
			npm list ${OPTIONAL_DEPENDENCIES[knex]} || npm install ${OPTIONAL_DEPENDENCIES[knex]}
		fi
	fi
}

install_store_optional_dependencies

exec "$@"