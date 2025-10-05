# Enclypse 3D Sphere Platform

This workspace contains the Enclypse 3D collaboration surface. The frontend is powered by **React + Vite + TailwindCSS + React Three Fiber**, while the backend provides a hardened **Express + Socket.io** API for managing domain layers and public profiles.

## Getting Started

### Prerequisites

* Node.js 18+
* npm 9+

### Installation

```bash
npm install
```

> **Note:** If your environment blocks access to the npm registry, configure an alternative registry mirror before installing dependencies.

### Available Scripts

#### Frontend

```bash
npm run dev
```

Starts the Vite development server on <http://localhost:5173>.

#### Backend API & Realtime Services

```bash
npm run server:dev
```

Runs the Express + Socket.io server (TypeScript) on <http://localhost:4000>. Update `.env` to override defaults such as `PORT`, `JWT_SECRET`, and rate-limiting limits.

### Environment Variables

Create a `.env` file at the project root to customize runtime configuration:

```
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=change-me
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
CACHE_TTL_SECONDS=15
```

## Project Structure

```
server/              # Express API, RBAC, realtime socket handling
  auth/
  config/
  data/
  layers/
  metrics/
  realtime/
  users/
src/
  layers/           # Frontend layer domain logic + Zustand store
  scene/            # 3D Enclypse sphere and layer rendering
  ui/               # Layer management panels & admin dashboard
  users/            # Shared user-facing types
  types/            # Shim typings for backend dependencies
```

## Features

* Modular domain layer system with RBAC controls.
* Admin dashboard for creating, updating, restricting, and deleting layers.
* Real-time synchronization of layer visibility and user presence via Socket.io.
* Proximity filtering and multi-layer visualization inside a 3D Enclypse sphere.
* Audit logs, metrics snapshotting, and cached API responses for performance.

## Security & Privacy

* JWT-protected routes for all write operations.
* Rate limiting, CORS, and Helmet middleware enabled by default.
* Public responses respect each user's `public` flag and hash user identifiers before exposure.

## Future Enhancements

* Layer-based collaboration invites and chat channels.
* Snapshot export (.glb/.png) and spatial clustering for dense user graphs.
* Extended Supabase integration for persistent storage.

---

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/RepertoireLLC/unworld3.0)