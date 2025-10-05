# Enclypse Messaging Workspace

This project provides a real-time, presence-aware messaging surface for the Enclypse environment. It contains a Vite + React client (TypeScript) and a lightweight Node.js backend backed by SQLite (via Node 22's experimental `node:sqlite` module) plus a custom WebSocket gateway.

## Project structure

```
.
├── server/                 # Node backend (REST + WebSocket)
│   ├── data/               # SQLite database location (created on boot)
│   ├── src/
│   │   ├── db.js           # Database bootstrap + seed data
│   │   ├── chatService.js  # Persistence helpers
│   │   ├── httpRouter.js   # REST endpoints
│   │   ├── websocketGateway.js # WebSocket upgrade + event handling
│   │   └── index.js        # Server entrypoint
│   └── package.json
├── src/                    # React client
│   ├── components/
│   ├── lib/                # API + realtime client helpers
│   └── store/              # Zustand stores (auth, chat, user, etc.)
└── README.md
```

## Requirements

* Node.js **22.0+** (the backend relies on the experimental `node:sqlite` module – start the server with `--experimental-sqlite`).
* npm 9+ or compatible package manager.

## Installation

1. Install frontend dependencies:
   ```bash
   npm install
   ```
2. (Optional) install backend dependencies. The backend has no third-party dependencies, so an install step is not required, but running `npm install` inside `server/` will create a lockfile if desired.

## Running the stack

### Backend

```
cd server
npm run dev
```

This launches the HTTP + WebSocket server on `http://localhost:4000` and seeds an initial dataset (three users plus a direct conversation). The server exposes:

* `GET /health` – health probe
* `GET /api/users` – list users with presence metadata
* `PUT /api/users/:id` – upsert user profile data
* `POST /api/users/presence` – update presence state
* `GET /api/conversations?userId=...` – paginated conversations for a user
* `POST /api/conversations` – ensure/create conversation
* `GET /api/conversations/:id/messages` – fetch paginated message history
* `POST /api/messages` – create/send a message (supports optimistic `clientMessageId`)
* `POST /api/read-receipts` – record read state

WebSocket connections should upgrade on `/ws` and speak JSON frames. Supported events:

* `identify` – `{ userId, name?, color? }`
* `message:send` – `{ conversationId?, recipientIds?, body, clientMessageId? }`
* `read:mark` – `{ conversationId, messageId? }`
* `history:request` – `{ conversationId, before?, limit? }`

Server pushes:

* `session:ready`
* `presence:update`
* `conversation:updated`
* `message:new`
* `message:ack`
* `read:update`
* `history:response`

### Frontend

```
npm run dev
```

The client expects the backend at `http://localhost:4000`. Override by defining `VITE_API_BASE_URL` (the WebSocket URL is derived automatically).

## Offline & reconnection model

* Conversations, memberships, messages, and read receipts persist to SQLite.
* The chat store hydrates from REST on login, then subscribes to WebSocket events for live updates.
* Outgoing messages are optimistically inserted locally and queued. Delivery occurs via REST once the network is available; WebSocket broadcasts reconcile server state using the `clientMessageId` to collapse duplicates.
* Presence is synchronized through WebSocket broadcasts; user lists are hydrated via REST and reconciled in the user store.
* The realtime client handles reconnects with exponential backoff and retries queued messages whenever connectivity returns.

## Notes

* Database files live in `server/data/enclypse.db` (ignored by Git).
* The server seeds three demo operators (`Alex Vega`, `Jules Kim`, `Sam Rivera`) for quick UI smoke tests.
* Tailwind + Framer-inspired UI components already include status/handshake affordances; connect the backend before evaluating real-time flows.
