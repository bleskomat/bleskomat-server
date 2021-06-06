# Helpful guides for nodejs + docker:
# https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md

FROM node:12-buster-slim AS builder

# Install dependencies needed during the build process:
RUN apt-get update && \
	apt-get install -yq \
		python \
		make \
		g++

# Create app directory:
WORKDIR /usr/src/app

# Copy project files into the docker image:
COPY . .

# Set node user as the owner of the app directory:
RUN chown -R node:node /usr/src/app

# Switch to node user:
USER node

# Install production dependencies as defined in package-lock.json:
RUN npm ci --only=production

# Start with a clean image again:
FROM node:12-buster-slim

# Install dependencies needed to run the docker image:
RUN apt-get update && \
	apt-get install -yq \
		jq

# Create app directory:
WORKDIR /usr/src/app

# Copy app files:
COPY --from=builder /usr/src/app .

# Set node user as the owner of the app directory:
RUN chown -R node:node /usr/src/app

# Switch to node user:
USER node

# Default entry-point to be executed when image is run:
ENTRYPOINT [ "/usr/src/app/docker-entrypoint.sh" ]

# Default command to be executed when image is run:
CMD [ "node", "index.js" ]
