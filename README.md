# Sphere Social Platform

A production-ready build of the Sphere Social experience. This repository now includes an Express-based edge server, security hardening, and deployment tooling so the application can be safely hosted on a public network.

## Table of contents

- [Requirements](#requirements)
- [Environment variables](#environment-variables)
- [Installation](#installation)
- [Available scripts](#available-scripts)
- [Running locally](#running-locally)
- [Building for production](#building-for-production)
- [Running in production](#running-in-production)
- [Docker](#docker)
- [Security defaults](#security-defaults)
- [Project structure](#project-structure)

## Requirements

- Node.js 18 LTS or newer (Node 20 recommended)
- npm 9+

## Environment variables

Copy the example file and adjust values for your environment:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `NODE_ENV` | Node runtime environment. Should be `production` in production deployments. |
| `PORT` | Port the Express server listens on. Defaults to `4173`. |
| `API_BASE_URL` | Absolute URL to the backend API consumed by the web app. Used for security headers. |
| `VITE_API_BASE_URL` | Injected into the client bundle for API requests. Mirrors `API_BASE_URL`. |
| `VITE_WS_URL` | WebSocket endpoint exposed to the client bundle. |
| `CORS_ORIGIN` | Comma-separated list of origins allowed to access API routes (if enabled). Leave blank to disable CORS. |
| `RATE_LIMIT_WINDOW_MS` | Window (in milliseconds) for Express rate limiting. |
| `RATE_LIMIT_MAX_REQUESTS` | Maximum number of requests allowed per window per IP. |
| `VITE_DEV_SERVER_PORT` | Custom development server port for Vite (optional). |
| `VITE_PREVIEW_PORT` | Custom preview/production port for Vite preview (optional). |

## Installation

Install dependencies with npm:

```bash
npm install
```

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server on all interfaces. |
| `npm run dev:server` | Runs the Express server in watch mode (requires a built client). |
| `npm run lint` | Lints the entire project with ESLint. |
| `npm run build` | Builds the client application into `dist/`. |
| `npm run build:server` | Compiles the Express server into `dist-server/`. |
| `npm run preview` | Serves the built client using Vite preview (mirrors production configuration). |
| `npm run start` | Starts the compiled Express server from `dist-server/`. |
| `npm run start:prod` | Builds the client and server then starts the Express server (useful for PaaS deployments). |

## Running locally

1. Install dependencies.
2. Copy `.env.example` to `.env` and update the values to match your local environment.
3. Start the Vite dev server:

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173` (or your configured port).

4. Optionally run the Express server against the built assets:

   ```bash
   npm run build
   npm run dev:server
   ```

## Building for production

```bash
npm run build
npm run build:server
```

This produces a static client bundle in `dist/` and an Express server bundle in `dist-server/`.

## Running in production

Ensure the build outputs exist, then start the server:

```bash
npm run start
```

The Express server serves the static assets with compression, Helmet security headers, rate limiting, and an `/health` endpoint for readiness checks.

## Docker

A multi-stage Dockerfile is provided for container deployments.

```bash
# Build the image
docker build -t sphere-social .

# Run the container
docker run -p 4173:4173 --env-file .env sphere-social
```

The container runs as an unprivileged user and exposes port `4173` by default.

## Security defaults

- Helmet enforces sensible security headers and a restrictive Content Security Policy (CSP).
- gzip compression is enabled for efficient asset delivery.
- Request body sizes are capped at 1MB by default.
- Basic rate limiting is configured via environment variables.
- CORS is opt-in and restricted to the provided allowlist.

Adjust any of these defaults in `server/index.ts` or environment variables to match your infrastructure requirements.

## Project structure

```
.
├── .dockerignore
├── .env.example
├── Dockerfile
├── README.md
├── package.json
├── server
│   ├── config
│   │   └── env.ts
│   └── index.ts
├── src
│   ├── App.tsx
│   ├── components
│   ├── config
│   │   └── env.ts
│   ├── index.css
│   ├── main.tsx
│   └── store
├── tsconfig.server.json
└── vite.config.ts
```

