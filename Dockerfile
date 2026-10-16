# syntax=docker/dockerfile:1
# One image, one origin: Express serves the built web app and the API.
# Keep the Node major in sync with .nvmrc.

FROM node:24-alpine AS build
WORKDIR /app

# Manifests first so the dependency layer is cached until a package.json or the lockfile changes.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace @support-copilot/web


FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    STATIC_DIR=/app/web \
    KNOWLEDGE_DIR=/app/knowledge
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
# Production dependencies of the server (and the shared workspace it links to) only.
RUN npm ci --omit=dev --workspace @support-copilot/server && npm cache clean --force

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server/tsconfig.json apps/server/
COPY apps/server/src apps/server/src
COPY knowledge knowledge
COPY --from=build /app/apps/web/dist web

# The base image ships an unprivileged `node` user.
USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node_modules/.bin/tsx", "apps/server/src/server.ts"]
