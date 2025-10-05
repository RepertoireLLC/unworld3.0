# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS build-deps
ENV NODE_ENV=development
COPY . .
RUN npm ci
RUN npm run build && npm run build:server

FROM base AS production
USER node
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build-deps /app/dist ./dist
COPY --from=build-deps /app/dist-server ./dist-server
EXPOSE 4173
CMD ["node", "dist-server/index.js"]
