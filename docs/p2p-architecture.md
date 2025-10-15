# Harmonia Peer-to-Peer Architecture

This document captures the decentralized networking design for Harmonia. It covers peer identity, encrypted transport, discovery, synchronization, and launcher integration.

## Identity and Trust

- Each node owns an **Ed25519 keypair** generated locally with `tweetnacl`.
- Keys are stored only in the user's encrypted Dexie database (`harmonia_mesh`).
- The public key fingerprint becomes the user-facing `peerId` (`HM-<hash>`).
- Key rotation regenerates the pair and reboots the Libp2p stack.
- Burn mode deletes all local keys, requiring re-authentication to rejoin the mesh.

### Message Signing

- All gossip payloads are signed (`nacl.sign.detached`).
- Recipients verify signatures before applying state transitions.
- Hash references ensure integrity of larger assets.

## Transport Stack

| Layer | Library | Purpose |
| --- | --- | --- |
| Link | WebRTC / WebSockets | Browser ↔ browser connectivity |
| Encryption | Noise protocol | Authenticated encryption for every stream |
| Multiplexing | MPLEX | Multiple logical streams per transport |
| PubSub | Gossipsub | Efficient fan-out for posts, chats, notifications |
| DHT | Kademlia | Content addressing + peer routing |

The node boots through `initializeP2PNode`, creating the Libp2p instance with the above services. Relay nodes keep DHT server mode enabled and accept more inbound streams.

## Discovery and Synchronization

- Peer discovery relies on **onion bootstrap lists** (optional). Entries are `.onion` addresses that expose WebRTC signaling. Users can host their own or opt into community fallback nodes.
- Each node maintains a local gossip log for replaying missed messages (`persistGossip`).
- Mesh updates are stored locally first and later conflict-resolved using CRDT semantics (future work: integrate Automerge).
- Relay nodes advertise themselves via the DHT and forward encrypted payloads without inspecting contents.

### Topics

- `harmonia.global.timeline`
- `harmonia.direct.<peerId>`
- `harmonia.files.meta`
- Additional namespaces can be configured through the mesh store.

## Tor / Arti Integration

- The desktop launcher boots an embedded [Arti](https://gitlab.torproject.org/tpo/core/arti) instance.
- Every peer publishes a private `.onion` URL that proxies their local Harmonia HTTP server.
- WebRTC signaling is tunneled through Tor, protecting IP metadata.
- Relay mode enables onion rendezvous circuits for bandwidth donors.

_Note:_ The UI currently displays relay / identity controls, while the launcher scripts provide hooks for wiring in the Arti runtime (see `docs/launcher.md`).

## Launcher Overview

We use **Tauri** for a minimal Rust + Vite shell:

1. Rust bootstrapper spawns Arti and surfaces the onion hostname to the renderer via an IPC bridge.
2. Node sidecar starts the Harmonia mesh node (`npm run start-node`).
3. Webview loads the Vite UI from `http://127.0.0.1:<port>`.
4. When the UI mounts, it requests the onion address + Tor status for display in the settings modal.

Build scripts: see `docs/launcher.md` and the updated README for per-OS instructions.

## Future Enhancements

- Integrate CRDT-based conflict resolution for posts and threads.
- Harden onion bootstrap infrastructure with proof-of-work admission control.
- Expand relay policies (rate limiting, quality-of-service tiers, energy saver modes).
- Integrate automatic key rotation schedules.

