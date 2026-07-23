FROM node:24-alpine AS builder

ARG UMAMI_SITE
ARG UMAMI_HOST
ENV VITE_UMAMI_SITE=${UMAMI_SITE}
ENV VITE_UMAMI_HOST=${UMAMI_HOST}
WORKDIR /build

COPY .yarn/releases ./.yarn/releases
COPY .yarn/patches ./.yarn/patches

COPY package.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./

RUN yarn install --immutable

COPY . .
RUN yarn build

FROM caddy:alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /build/dist /srv

EXPOSE 80
