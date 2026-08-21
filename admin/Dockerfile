# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --ignore-platform
COPY . .
RUN yarn build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
