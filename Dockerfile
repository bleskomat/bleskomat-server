# Helpful guides for nodejs + docker:
# https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md

FROM node:14-buster-slim

# Create app directory:
WORKDIR /usr/src/app

# Set owner of app directory:
RUN chown node:node /usr/src/app

# Copy project files into the docker image:
COPY --chown=node:node . .

# Switch to node user:
USER node

# Install production dependencies as defined in package-lock.json:
RUN npm ci --only=production

# Install data store dependencies:
RUN npm install knex@0.95.x pg@8.6.x

# Create data directory:
RUN mkdir -p /usr/src/app/data

# Default command to be executed when image is run:
CMD [ "npm", "start" ]
