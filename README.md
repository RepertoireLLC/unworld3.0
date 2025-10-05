# unworld3.0 — Enclypse Workspace

Enclypse is an encrypted, presence-aware collaboration environment designed around modular operator tooling. This workspace edition adds a configurable control deck where encrypted vaults, privacy templates, and audit telemetry can be orchestrated without leaving the primary console.

## ✨ Feature Highlights

- **Workspace Panel** – A modular grid that persists layout, widget sizing, and collapse state locally for every operator session.
- **Encrypted File Vault** – Client-side AES-GCM encryption with permission-aware download gating and per-file activity logging.
- **Widget Management Library** – Activate, remove, resize, and focus workspace widgets with a resettable registry.
- **Privacy Template Presets** – Apply curated permission blueprints (solo lockdown, ops sync, broadcast audit, live online cohort) to vault assets or workspace modules.
- **Activity & Permission Log** – Filterable audit trail capturing uploads, download attempts, permission grants, and template deployments.
- **Header Quick Actions** – One-click navigation chips to focus vault, privacy, layout, or audit widgets from anywhere in the console.

## 🧱 Architecture Overview

- **Front-end**: React + TypeScript, styled with TailwindCSS and Lucide icons. State orchestration uses Zustand stores with local persistence.
- **Encryption**: Browser-native Web Crypto API (AES-GCM) powers file encryption/decryption through a shared `encryptionService`.
- **Storage**: Encrypted payloads, workspace layout, permissions, and audit trails persist in browser storage (via Zustand `persist`).
- **Permissions**: A dedicated permission service shares rule evaluation and templates across the vault, templates widget, and activity log.
- **Logging**: Activity store centralizes success/warning/error events for visibility across widgets.

## 🚀 Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the Vite development server**
   ```bash
   npm run dev
   ```

3. **Open the console**
   Navigate to the printed localhost URL and authenticate (register/login) to unlock the workspace. Layout state and vault entries are persisted per browser profile.

## ⚙️ Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_VAULT_DEFAULT_KEY` | Optional default encryption passphrase pre-filled in the encrypted vault widget. Useful for provisioning shared demo environments. | _empty_ |

### Storage adapters

The workspace uses the built-in Zustand `persist` middleware which targets `localStorage`. For environments that require alternate persistence (e.g., IndexedDB or cloud sync), replace the storage adapter in:

- `src/store/workspaceStore.ts`
- `src/store/vaultStore.ts`
- `src/store/permissionStore.ts`
- `src/store/activityLogStore.ts`

Each file exposes a single `persist` configuration block that can be swapped with custom storage drivers. Ensure the replacement adapter conforms to the standard Storage API (`getItem`, `setItem`, `removeItem`).

### Encryption keys

- Operators must supply a strong passphrase per upload/download cycle. Keys are never stored.
- AES-GCM encryption happens entirely client-side; losing the passphrase renders the payload unrecoverable.
- Set `VITE_VAULT_DEFAULT_KEY` during development to streamline repeated testing. Do **not** ship shared keys in production builds.

## 🧭 Using the Workspace

1. **Manage layout**: Use the workspace drop-downs (arrangement, density, and category) or the widget management block to toggle modules, adjust widths, or reset the grid.
2. **Secure files**: Use the encrypted vault widget to upload files (encrypted at rest) and download them with the correct passphrase. Permission badges display the current access graph.
3. **Apply templates**: Select a vault asset (or the workspace module) and push a privacy preset to rewrite the permission matrix instantly.
4. **Audit activity**: Monitor successful uploads, blocked downloads, and permission changes via the activity log. Filter by severity to triage faster.

## 🛡️ Security Notes

- AES-GCM with a SHA-256 derived key is used for all vault payloads.
- Permission enforcement runs before decrypting any payload, reducing unnecessary crypto operations for unauthorized attempts.
- Activity logging captures both successful and failed access events to maintain an audit trail.

## 📁 Key Directories

```
src/
├─ components/
│  └─ interface/
│     ├─ WorkspacePanel.tsx
│     └─ workspace/
│        └─ widgets/
├─ services/
│  ├─ encryptionService.ts
│  └─ permissionService.ts
└─ store/
   ├─ activityLogStore.ts
   ├─ permissionStore.ts
   ├─ vaultStore.ts
   └─ workspaceStore.ts
```

## ✅ Next Steps

- Integrate backend storage adapters (S3, PostgreSQL, etc.) by replacing the Zustand persist targets.
- Extend permission templates with role-based policies sourced from the authentication service.
- Wire real-time presence events into the workspace so template rules can react instantly to operator changes.

