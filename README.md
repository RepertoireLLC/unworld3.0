# unworld3.0

A Vite + React prototype exploring presence-driven social interactions. The current build focuses on a 3D sphere of users, themed visuals, lightweight chat, and profile modals powered by local mock data.

## Getting started

```bash
npm install
npm run dev
```

The app will be available at http://localhost:5173.

## Available scripts

- `npm run dev` – start the Vite development server.
- `npm run build` – create an optimized production build.
- `npm run preview` – preview the production build locally.
- `npm run lint` – run the ESLint checks.

## Tech stack

- React 18 with Vite for fast iteration.
- Tailwind CSS for styling.
- @react-three/fiber and drei for the sphere visualization.
- Zustand for simple state management across auth, chat, and themes.

## Project structure

```
src/
  components/    # UI building blocks (sphere, chat, modals, etc.)
  store/         # Zustand stores and mock data helpers
  main.tsx       # React entry point
```

The repository intentionally keeps the scope small so the core experience remains easy to reason about. Remove or extend modules as needed for your experiments.
