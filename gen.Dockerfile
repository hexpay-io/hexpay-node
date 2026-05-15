FROM node:20-alpine

ARG OPENAPI_TS_VERSION=0.97.1
ARG CLIENT_FETCH_VERSION=0.13.1

RUN npm install -g \
        "@hey-api/openapi-ts@${OPENAPI_TS_VERSION}" \
        "@hey-api/client-fetch@${CLIENT_FETCH_VERSION}"

ENV HOME=/tmp
# Let configs loaded from /work resolve globally-installed packages
# (jiti/c12 resolve relative to the config file, which lives outside this image).
ENV NODE_PATH=/usr/local/lib/node_modules
WORKDIR /work

ENTRYPOINT ["openapi-ts"]
