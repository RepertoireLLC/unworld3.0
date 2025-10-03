# Enclypse Presence Platform

Enclypse is a privacy-first communications stack that combines a modular HTML front-end, a secure Node/Express backend, and Electron packaging so the entire workspace can be downloaded and executed offline. The project ships with:

- Authentication, contacts, search, QR codes, and presence-aware chat views as standalone HTML modules.
- A hardened Express backend that stores user data in SQLite, encrypts messages and attachments with libsodium, and exposes real-time presence through WebSockets.
- Portable bootstrapping scripts and Electron packaging for a desktop-class experience out-of-the-box.
- Media flair including Snapchat-style ephemeral messages, animated secret photo filters with on-screen motion cues, and encrypted shared albums with an in-app lightbox viewer.
- Peer-to-peer mini-games (tic-tac-toe & trivia), an on-device AI sidekick for summaries/memes, and QR treasure hunts.
- A constellation-driven sphere that renders animated avatars, glowing presence trails, shared secret links, and per-user theming.
- A sealed secret-link vault that encrypts hidden rooms per participant before syncing them across the sphere.

## Repository layout

```
enclypse/
  frontend/           # Standalone HTML modules + shared assets
  backend/            # Express server, SQLite schema, encryption helpers
  scripts/setup.bat   # One-click bootstrap for Windows + Conda users
electron/             # Electron entry point wrapping the HTML modules
src/                  # Existing Vite playground (kept for rapid prototyping)
```

## Prerequisites

- Node.js 20+
- SQLite3 runtime (bundled with most platforms)
- (Optional) Conda if you want to use the one-click `setup.bat`

## Quick start

Install dependencies and run the backend plus Electron shell in parallel:

```bash
npm install
npm run enclypse
```

If the environment blocks access to the public npm registry, install dependencies manually using your preferred mirror, then re-run the commands above.

The backend is exposed on **http://localhost:4000** with WebSockets on **ws://localhost:4001**. Static HTML modules are available at **http://localhost:4000/enclypse/login.html** and packaged Electron loads them locally.

### Windows one-click setup

```
enclypse\scripts\setup.bat
```

The script will create a Conda environment, install both front-end and back-end dependencies, start the secure backend, and finally launch the Electron shell.

## Backend API highlights

- `POST /api/register` and `POST /api/login` for Argon2-hardened authentication.
- `GET /api/presence` returns all users with live online/offline status.
- `POST /api/messages` and `POST /api/messages/attachment` persist end-to-end encrypted payloads.
- `GET /api/messages/:username` streams encrypted conversation history without ever decrypting messages server-side.
- `GET /api/qr/me` and `GET /api/qr/:username` provide ready-to-scan contact sharing.
- `GET /api/transports` and `POST /api/transports` toggle between internet messaging and the optional Bluetooth relay.
- `GET/POST /api/preferences` manage personal themes, avatar URLs, trails, and presence chimes.
- `GET/POST /api/albums` plus `POST /api/albums/:id/items` power encrypted shared galleries.
- `GET/POST /api/games` and `POST /api/games/:id/move` coordinate encrypted peer mini-games.
- `GET/POST /api/secret-links` (with per-recipient sealed keys) and `POST /api/qr/treasure` unlock secret rooms and treasure hunts around the sphere.

Refer to `enclypse/frontend/common.js` and the individual HTML modules for detailed usage examples.

## Bluetooth relay mode

Enclypse ships with an experimental Bluetooth Low Energy transport for nearby chats. When the host computer supports BLE (and the optional `@abandonware/bleno`/`@abandonware/noble` native modules are available), users can switch their chat channel to **Bluetooth** from the chat screen. Messages remain end-to-end encrypted and travel directly between peers without Wi‑Fi. Attachments continue to require the internet channel.

- Enable Bluetooth on the operating system and ensure the device is discoverable.
- Open any conversation in `chat.html`, switch the **Channel** selector to Bluetooth, and wait for the status badge to turn green.
- Nearby Enclypse peers advertising over BLE will receive messages even if they are offline from Wi‑Fi; conversations sync back to the primary store the next time they connect.

If BLE support is not available, the selector remains on Internet and the backend gracefully reports the limitation.

## Notes on encryption

- Text messages are encrypted using libsodium sealed boxes (X25519 + XSalsa20-Poly1305) with per-message nonces.
- Attachments leverage XChaCha20-Poly1305. Files are stored encrypted on disk; downloads are decrypted on-demand after authorization checks.
- Private keys are protected using libsodium secret boxes derived from the user’s password and stored alongside Argon2id password hashes.
- Secret link payloads are sealed for every participant using libsodium’s anonymous boxes so only invited nodes can open their portals.

## Testing the WebSocket presence map

1. Start the backend (`npm run backend:start`).
2. Register two accounts via `http://localhost:4000/enclypse/register.html`.
3. Log in on both accounts and open `sphere.html` – the nodes will glow based on each user's chosen theme, show animated avatar sprites, and draw glowing trails of recent movement.
4. Use Ctrl/Cmd-click on two nodes to drop a shared secret link, watch constellations snap into place, and listen for optional presence chimes when a favorite contact comes online.
5. Chat in real-time; attachments, albums, mini-games, and treasure hunts update instantly via WebSockets.

## Portable builds

- The Electron entry (`electron/main.js`) wraps the HTML modules for a desktop-class experience.
- `setup.bat` orchestrates Conda environment creation, backend start-up, and Electron launch for Windows users.
- Future installer/portable packaging can be layered on top of this structure without changes to application logic.

## Troubleshooting

- **Dependency mirrors:** If npm registry access is restricted, configure the `npm config set registry` command to point to an accessible mirror before running `npm install`.
- **Database reset:** The backend auto-recreates its SQLite schema if the database file becomes corrupted. Delete `enclypse/backend/data/enclypse.sqlite` to reset state.
- **Uploads:** Encrypted attachments are stored in `/uploads`. Clearing the directory is safe; encrypted metadata remains in SQLite.

Enjoy building on Enclypse! 🚀
