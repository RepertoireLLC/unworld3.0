# Harmonia Launcher Blueprint

The Harmonia launcher promotes a local-first, privacy-preserving runtime with Tor baked in. This guide covers project layout, build commands, and OS-specific notes.

## Stack Overview

- **Tauri 2.x** shell with Rust + Vite renderer.
- **Node sidecar** that boots the Harmonia mesh node (`libp2p`, Tor proxy bindings, database sync).
- **Arti (Rust Tor)** embedded as a managed background process.
- **Webview** exposing Harmonia UI and IPC channels for onion metadata.

## Directory Layout

```
harmonia-launcher/
├── src-tauri/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs              # Tauri bootstrap
│   │   ├── arti.rs              # Tor orchestration helpers
│   │   └── ipc.rs               # Commands exposed to the UI
│   └── build.rs
├── node/
│   ├── package.json
│   ├── src/
│   │   ├── index.ts             # Starts Harmonia mesh node
│   │   └── torBridge.ts         # Communicates with embedded Arti instance
└── README.md
```

## Build Commands

| Platform | Command |
| --- | --- |
| All | `npm run build-node` (compiles Node sidecar with esbuild) |
| All | `npm run build-ui` (Vite production build) |
| All | `cargo build --release --manifest-path src-tauri/Cargo.toml` |
| Windows | `npm run package-win` (bundles `.exe`) |
| macOS | `npm run package-mac` |
| Linux | `npm run package-linux` |

Scripts are defined in the root `package.json` for convenience.

## Runtime Flow

1. Launcher starts and initializes logging, config directories, and encryption keys.
2. Rust spawns Arti and monitors the `.onion` hostname file.
3. Once Arti reports readiness, the Node sidecar receives the onion address via IPC and updates the Harmonia mesh store.
4. The Vite UI opens automatically in the embedded webview.
5. When the user closes the window, Tauri orchestrates shutdown of the Node sidecar and Arti process (graceful Tor close).

## Tor Configuration

- Use Arti's application-level API for memory-only state when the user enables burn mode.
- Provide configuration toggles for custom bridges, pluggable transports, and guard rotation.
- Ensure onion service keys live under the user's profile directory with strict permissions.

## Relay Mode

- When relay mode is enabled from the UI, an IPC command updates the Node sidecar.
- The sidecar toggles Libp2p DHT server mode and exposes additional onion rendezvous points.
- Bandwidth contributions are rate-limited to a configurable ceiling (default 2 Mbps).

## Packaging Notes

- Windows builds require the [Microsoft VC++ redistributable](https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist).
- macOS builds must be signed and notarized; use `codesign` and `xcrun notarytool`.
- Linux builds rely on AppImage packaging for portability.

## Testing Checklist

- [ ] UI loads with Tor disabled (offline-first mode).
- [ ] UI loads with Tor enabled and verifies onion reachability.
- [ ] Relay toggle updates Node sidecar log output.
- [ ] Key rotation triggers onion address regeneration.
- [ ] Burn mode wipes local data and restarts onboarding flow.

