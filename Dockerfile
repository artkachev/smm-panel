FROM node:22-alpine AS deps
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /web
# /api/* rewrites are resolved at build time: point them at the internal API service
ARG SMM_API_URL=http://api:8000
ENV SMM_API_URL=$SMM_API_URL NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /web/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN adduser -D -u 10001 web
COPY --from=build --chown=web /web/.next/standalone ./
COPY --from=build --chown=web /web/.next/static ./.next/static
USER web
EXPOSE 3000
CMD ["node", "server.js"]
