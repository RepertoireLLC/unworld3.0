# Enclypse Workspace

Enclypse is a modular, presence-aware operating system for founders and operators. This workspace stitches together a three-dimensional visibility sphere, encrypted communications, and a commerce hub that can broadcast into different social layers.

## Project Layout

```
/README.md                  – project overview and setup instructions
/package.json               – Vite + React (TypeScript) client
/server/                    – Node.js + Express API with SQLite persistence
/src/                       – Front-end source code (React, Tailwind, Zustand)
```

## Front-end

- **Framework**: React 18 + Vite + TypeScript
- **State**: Zustand stores for auth, sphere presence, navigation, and commerce
- **Styling**: Tailwind CSS with custom gradients for the Enclypse aesthetic
- **3D Layer**: `@react-three/fiber` + `drei` for the active sphere
- **Key features**:
  - Authenticated operator console with light/dark/neon themes
  - Layer-aware visibility controls (private / network / industry / public)
  - Integrated business hub for launching Enclypse web stores
  - Public registry workspace with search, filters, and sphere overlays

## Back-end

- **Runtime**: Node.js (Express)
- **Database**: SQLite (using `better-sqlite3`)
- **Security**: AES-256-GCM encryption for non-public store payloads, bcrypt password hashing
- **API Surface**:
  - `POST /auth/register`, `POST /auth/login`
  - `PUT /profiles/:id/visibility`
  - `POST /stores`, `GET /stores/:ownerId`
  - `POST /registry`

### Environment Variables

Create a `.env` file inside `server/` if you want to override defaults:

```
PORT=4000
DATABASE_PATH=./enclypse.db
ENCRYPTION_KEY=replace-with-32-byte-secret
```

## Getting Started

### 1. Install dependencies

```bash
npm install
cd server && npm install && cd ..
```

### 2. Run the API

```bash
cd server
npm run dev
```

The Express server listens on `http://localhost:4000` by default. It will create `enclypse.db` in the project root and auto-initialize tables.

### 3. Run the client

```bash
npm run dev
```

The Vite dev server exposes the React front-end at `http://localhost:5173`. The client reads `VITE_API_URL` (defaults to `http://localhost:4000`) to communicate with the API.

### 4. Build for production

```bash
npm run build
cd server && npm run build
```

## Extending the Platform

- **Custom modules**: Add new workspaces by extending the Zustand `navigationStore` and dropping a component in `src/components/workspaces`.
- **Sphere data**: Feed the 3D layer through `useUserStore` and `useBusinessStore`. Each store visibility automatically becomes a glowing node when published to a matching layer.
- **Encryption**: Sensitive payloads for private/friends/industry layers are encrypted server-side. Only public snapshots surface in the registry.
- **Registry Integrations**: Use `POST /registry` to fetch discoverable operators and businesses filtered by skill, industry, and visibility layer.

## Deployment Notes

- SQLite keeps data local by default; point `DATABASE_PATH` to a persistent volume in production.
- Rotate `ENCRYPTION_KEY` and use HTTPS for all traffic.
- Consider swapping SQLite for Postgres when concurrent writes increase.
- Use a reverse proxy (NGINX, Fly.io, Render, etc.) to run the client and API behind a single origin.

## Status

This repository now contains a cohesive “business OS” prototype—complete with auth, presence layers, commerce publishing, and a discoverable public registry. Extend it with analytics dashboards, AI copilots, or additional industries to keep scaling Enclypse.
