# Contributing to Harmonia

Thank you for helping evolve Harmonia. This document summarizes expectations for code contributions, reviews, and releases.

## Development Workflow

1. **Fork and branch** – create feature branches from `main` using the format `feature/<topic>` or `fix/<topic>`.
2. **Install dependencies** – run `npm install` once per clone.
3. **Run the playground** – `npm run dev` to iterate; ensure UI and mesh flows still work.
4. **Lint before commit** – `npm run lint` should pass without warnings.
5. **Write clear commits** – use present-tense imperatives, e.g., `Add mesh store with WebRTC helpers`.
6. **Open a PR** – summarize changes, tests, and any follow-up tasks. Reference related issues when available.

## Code Style

- Prefer **TypeScript** and **functional React components**.
- State lives in **Zustand** stores; avoid prop drilling when a shared store exists.
- Follow Tailwind utility classes for styling; keep complex styles in CSS modules only when necessary.
- Respect the platform language of “Harmonia” (e.g., mesh, resonance, agora) for UI copy and naming.
- Maintain **DRY** and **SOLID** principles. Extract shared helpers into `src/utils`.

## Testing & Quality

- Manual regression: verify authentication, feed rendering, tab management, chat, and settings.
- Add unit coverage when introducing critical logic (vector math, encryption, networking helpers).
- Ensure the app builds: `npm run build` must succeed.

## Documentation

- Update `README.md` when introducing new workflows or dependencies.
- Document new modules inline with JSDoc/TSdoc where intent is non-trivial.
- Keep change logs in commit messages; larger features can be summarized in PR descriptions.

## Security & Privacy

- Never commit secrets, real API keys, or personal data.
- All network additions must respect the principle of user-controlled visibility and local-first storage.
- Cryptographic primitives should rely on vetted browser/Node APIs (WebCrypto, libsodium, etc.).

## Releases

- Versioning follows semantic guidelines. Tag releases after merging to `main` once manual regression completes.
- Publish release notes summarizing key changes, migrations, and compatibility considerations.

We value respectful collaboration and thoughtful review. If you’re unsure about an approach, open a draft PR or start a discussion before coding.
