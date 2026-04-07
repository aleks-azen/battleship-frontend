---
paths:
  - "src/**/*.jsx"
  - "src/**/*.js"
---

# Frontend Rules — battleship-frontend

## Framework & Styling
- React with functional components and hooks only (no class components)
- MUI components + sx prop for all styling. NOT `makeStyles`, `useStyles`, `styled()`, or separate CSS files — those are MUI v4 patterns
- Emotion for MUI's CSS-in-JS (already included with MUI)

## Content Separation
- All static text, labels, ship definitions in `src/content/` files
- Components import from content — never hardcode user-facing strings

## API Communication
- Native `fetch()` only — no axios or other HTTP libraries
- API base URL from `import.meta.env.VITE_API_URL`
- Player token passed via `X-Player-Token` header
- All API calls in `useApi.js` hook

## State Management
- React hooks only (useState, useEffect, useCallback, useRef)
- No Redux, Zustand, or other state management libraries
- Player token persisted in sessionStorage for page refresh survival

## Routing
- React Router DOM with BrowserRouter
- Routes: /, /game/:gameId, /history

## Responsive Design
- MUI responsive breakpoints (xs, sm, md, lg)
- Board cells scale with viewport
- Mobile-first approach

## Polling Pattern
- Poll `GET /games/{id}/state` every 1.5s during opponent's turn
- Stop polling when it's player's turn or game is over
- Use `updatedAt` timestamp to skip redundant re-renders

## Ship Placement Controls
- Click cell to place selected ship at that position
- Click an already-placed ship to rotate it in place (H to V)
- Right-click an already-placed ship to remove it
- No drag-and-drop. No external interaction libraries.

## Build
- Vite for development and production builds
- `npm run dev` for local development
- `npm run build` produces `dist/` for S3 upload
