# unworld3.0

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/RepertoireLLC/unworld3.0)
## Ghostline Server (Enclypse Core)

A hardened Node.js backend that provides encrypted messaging storage, realtime relays, and presence orchestration for the Ghostline network.

### Features
- Zero-trust ready API surface with libsodium-based payload handling.
- Secure SQLite schema with at-rest encryption using NaCl secretbox.
- WebSocket relay hub for peer signaling and encrypted payload fan-out.
- Presence heartbeat recording with configurable timeouts.
- Encrypted developer logs that never expose plaintext debug information.
- Plugin registry to support future sentient node extensions.

### Directory Structure
```
server/
  package.json
  tsconfig.json
  .env.example
  config/
    templates/
      ghostline-runtime.config.template.json
  src/
    config/
      env.ts
    crypto/
      enclypse.ts
      sodium.ts
    database/
      connection.ts
      initialize.ts
    logging/
      secureLogger.ts
    plugins/
      registry.ts
    presence/
      presenceService.ts
    routes/
      authRoutes.ts
      messageRoutes.ts
      presenceRoutes.ts
      systemRoutes.ts
    services/
      messageService.ts
      realtimeHub.ts
      sessionService.ts
      userService.ts
    types/
      index.ts
    utils/
      time.ts
    server.ts
```

### Setup
1. Install dependencies:
   ```bash
   cd server
   npm install
   ```
2. Copy the environment template and provide a 32-byte base64 key:
   ```bash
   cp .env.example .env
   ```
   Generate a key with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

The realtime relay listens on `/realtime` and expects clients to authenticate at the application layer using end-to-end encrypted tokens.

### Packaging Targets
- Node.js service (current implementation)
- Desktop (.exe / .AppImage) and Android (.apk) distributions will be orchestrated by upcoming Harmonia OS packaging workflows.
