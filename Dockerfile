FROM node:20-alpine3.20 AS builder

ARG UMAMI_SITE
ARG UMAMI_HOST
ENV NEXT_PUBLIC_UMAMI_SITE=${UMAMI_SITE}
ENV UMAMI_HOST=${UMAMI_HOST}
WORKDIR /build

COPY .yarn/releases ./.yarn/releases

COPY package.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./

RUN yarn install --immutable

COPY . .
RUN yarn build

FROM node:20-alpine3.20 AS runner

RUN apk add dumb-init

USER node
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /build/next.config.js ./
COPY --from=builder /build/public ./public
COPY --from=builder /build/package.json ./package.json

COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
