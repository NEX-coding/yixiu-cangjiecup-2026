# syntax=docker/dockerfile:1
ARG APP_NAME=user-app
ARG APP_PORT=3002

FROM node:20-bookworm-slim AS deps
ARG APP_NAME
WORKDIR /app/${APP_NAME}
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY ${APP_NAME}/package.json ${APP_NAME}/package-lock.json* ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
ARG APP_NAME
WORKDIR /app
COPY --from=deps /app/${APP_NAME}/node_modules ./${APP_NAME}/node_modules
COPY ${APP_NAME} ./${APP_NAME}
COPY data ./data
COPY 图2头发参考图.png ./图2头发参考图.png
COPY 图2背景参考图.png ./图2背景参考图.png
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/${APP_NAME}
RUN npm run build

FROM node:20-bookworm-slim AS runner
ARG APP_NAME
ARG APP_PORT
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${APP_PORT}
ENV HOSTNAME=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nodejs

COPY --from=builder /app/${APP_NAME}/.next/standalone ./${APP_NAME}/
COPY --from=builder /app/${APP_NAME}/.next/static ./${APP_NAME}/.next/static
COPY --from=builder /app/${APP_NAME}/public ./${APP_NAME}/public
COPY data ./data
COPY 图2头发参考图.png ./图2头发参考图.png
COPY 图2背景参考图.png ./图2背景参考图.png

RUN mkdir -p ${APP_NAME}/data/uploads \
  && chown -R nodejs:nodejs /app

USER nodejs
WORKDIR /app/${APP_NAME}
EXPOSE ${APP_PORT}
CMD ["node", "server.js"]
