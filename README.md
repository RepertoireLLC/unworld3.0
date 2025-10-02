# Unworld 3.0 (Enclypse Prototype)

This project pairs a WebGL-powered social discovery experience with a lightweight API that simulates the Enclypse knowledge network. The frontend is built with React, Vite, TailwindCSS, and Zustand, while the backend exposes an Express API with in-memory persistence for authentication, user presence, stories, chat, and friend management.

## Getting Started

Install dependencies once:

```bash
npm install
```

Run the API (defaults to `http://localhost:4000`):

```bash
npm run dev:server
```

In a separate terminal start the Vite dev server:

```bash
npm run dev
```

By default the API seeds a few Enclypse personas:

| Email | Password |
| --- | --- |
| `aurora@enclypse.io` | `enclypse123` |
| `atlas@enclypse.io` | `enclypse123` |
| `nova@enclypse.io` | `enclypse123` |

You can register new accounts directly from the UI. All data is stored in memory for quick iteration—restart the API to reset the state.