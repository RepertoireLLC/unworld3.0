# Harmonia — Decentralized Social Sphere

Harmonia is an open-source, peer-to-peer social environment that emphasizes user agency, local data ownership, and encrypted collaboration. The platform blends a 3D social atlas with real-time feeds, forum threads, encrypted chat, and modular AI integrations.

## Key Features

- **Decentralized mesh networking** powered by Libp2p (WebRTC + WebSockets) with optional lightweight indexers for peer discovery and onion bootstrap.
- **Encrypted local storage** for messages and personal assets, backed by browser-native cryptography.
- **Modular interface** with closable workspace tabs, responsive feeds, and a customizable settings console.
- **Interest-aware recommendations** leveraging aging vectors and transparent tagging to surface resonant content.
- **Forum + media sharing** with support for images, video embeds, curiosity boosts, and threaded conversations.
- **Real-time chat** launched directly from the Harmonia sphere with persistent, encrypted history.
- **Extensible AI gateway** for connecting ethical AI services that inherit Harmonia’s safeguard policies.

## Project Structure

```
├── src/
│   ├── components/           # Interface panels, chat windows, sphere overlay, forum views
│   ├── core/                 # Conscious core, ethics registry, and mesh networking utilities
│   ├── store/                # Zustand stores (auth, mesh, storage, forum, interests, etc.)
│   ├── utils/                # Encryption helpers, vector math, IDs, logging
│   └── App.tsx               # Root composition and feature orchestration
├── scripts/
│   └── harmonia-node.mjs     # Optional mesh indexer / fallback relay
├── docs/                     # Platform manifest + design notes
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

> **Note:** Some environments block peer-to-peer packages (e.g., `@libp2p/bootstrap`). If `npm install` fails with a 403, configure your registry proxy or mirror and retry.

### Development Server

```bash
npm run dev
```

The Vite dev server boots on <http://localhost:5173>. Log in with the mock credentials supplied in the onboarding modal to explore the authenticated experience.

### Production Build

```bash
npm run build
npm run preview
```

### Peer Node Runtime

Every Harmonia session now doubles as a Libp2p node. The React app bootstraps the mesh automatically after authentication. For headless or CLI scenarios:

```bash
npm run build-node   # emits dist/node/index.js placeholder build
npm run start-node   # runs the node sidecar (requires build step)
```

Set `HARMONIA_RELAY=1` to enable relay mode for bandwidth donation.

### Optional Mesh Indexer

Harmonia defaults to direct peer discovery. For environments that need a rendezvous layer, run the lightweight indexer:

```bash
npm run mesh:indexer
```

This starts an HTTP service on port `8787` (override with `HARMONIA_PORT`). Endpoints:

- `POST /announce` – register a peer `{ peerId?, displayName?, channels? }`
- `GET /peers` – list live peers for discovery
- `POST /signal` – push WebRTC signals `{ fromPeerId, toPeerId, signals }`
- `GET /signal/:peerId` – pull queued signals destined for a peer

### Launcher Packaging

Desktop binaries ship through a Tauri-based launcher that embeds an Arti (Tor) node and spins up the Harmonia UI locally.

```bash
npm run build-node   # ensures the node sidecar exists
npm run build:ui     # Vite production bundle for the webview
npm run package-win  # or package-mac / package-linux
```

Refer to [docs/launcher.md](docs/launcher.md) for detailed platform guidance.

## Network Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Harmonia Client (React + Zustand)                        │
│  ├─ UI + local-first persistence                         │
│  └─ P2P Store → Libp2p node                              │
│         ├─ WebRTC/WebSocket transports                   │
│         ├─ Noise encryption + MPLEX multiplexing         │
│         ├─ Gossipsub pubsub topics                       │
│         └─ Kademlia DHT for peer + content lookup        │
└──────────────────────────────────────────────────────────┘
                │
        Tor/Arti Onion Routing
                │
┌──────────────────────────────────────────────────────────┐
│ Optional Relay / Bootstrap Nodes                         │
│  ├─ Provide onion-based signaling endpoints              │
│  └─ Index peers without storing content                  │
└──────────────────────────────────────────────────────────┘
                │
┌──────────────────────────────────────────────────────────┐
│ Peer Mesh                                               │
│  ├─ Posts / feeds / chats broadcast over pubsub         │
│  ├─ Assets verified via hash references                 │
│  └─ Conflict resolution handled locally                 │
└──────────────────────────────────────────────────────────┘
```

Additional architecture notes are available in [docs/p2p-architecture.md](docs/p2p-architecture.md).

## Privacy & Security

- Private conversations and assets are encrypted with AES-GCM using browser-native Crypto APIs and persisted to local storage only.
- Mesh networking leverages WebRTC’s DTLS transport; additional trust controls (public discovery and auto-linking) are configurable via Settings → Mesh Governance.
- Identity, relay mode, and key rotation controls now live in the Settings modal → Mesh Governance.
- Public content is opt-in. Posts, feeds, and AI routing only operate on explicitly shared data.

## Extending Harmonia

- Add interface modules by composing React components and Zustand stores under `src/components` and `src/store` respectively.
- Use `useP2PStore.publish` for signed gossip broadcasts or `useMeshStore.registerChannelListener` to subscribe to custom mesh channels.
- Extend AI integrations through `src/core/aiRegistry.ts`, ensuring each connector respects the Harmonia ethics contract.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for coding standards, branching strategy, and review guidelines.

## License

Released under the [MIT License](LICENSE). Harmonia is built for the community—fork, extend, and share improvements responsibly.
