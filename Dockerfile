FROM node:16-alpine AS builder

WORKDIR /build

# Docker is hell and won't respect the `!` lines in dockerignore for some reason :D
COPY .yarn/plugins ./.yarn/plugins
COPY .yarn/releases ./.yarn/releases
# COPY .yarn/sdks ./.yarn/sdks
# COPY .yarn/patches ./.yarn/patches
# COPY .yarn/versions ./.yarn/versions

COPY package.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./

RUN yarn install --immutable

COPY . .
RUN yarn build
# @prisma/nft doesn't pick up on the Prisma binaries so we need to manually include them
RUN cp -r ./node_modules/@prisma/engines/libquery_engine-linux-musl.so.node ./.next/standalone/node_modules/@prisma/engines/
RUN cp -r ./node_modules/@prisma/engines/prisma-fmt-linux-musl ./.next/standalone/node_modules/@prisma/engines/

FROM node:16-alpine AS runner

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
