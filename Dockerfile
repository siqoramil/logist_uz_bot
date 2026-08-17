# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile


FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock tsconfig.json ./
COPY src ./src
RUN yarn build


FROM node:24-alpine AS prod-deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --production && \
    yarn cache clean


FROM node:24-alpine AS runner
WORKDIR /app

RUN apk add --no-cache tini

ENV NODE_ENV=production \
    NODE_OPTIONS="--enable-source-maps"

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
