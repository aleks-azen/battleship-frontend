# battleship-frontend

React + MUI + Vite frontend for a Battleship game. Static SPA deployed to S3.

## Quick Start
```bash
npm install
npm run dev       # dev server on localhost:5173
npm run build     # production build to dist/
```

## Environment Variables
- `VITE_API_URL` — Backend API base URL (default: `http://localhost:3000`)

## Project Structure
```
src/
├── components/   # Reusable UI components (GameBoard, Cell, ShipList, StatusBar, Nav)
├── pages/        # Route-level page components (Home, Game, History)
├── hooks/        # Custom hooks (useApi, useGameState)
├── content/      # Static content, labels, ship definitions
├── App.jsx       # Router setup
├── main.jsx      # Entry point with MUI ThemeProvider
└── theme.js      # MUI theme (navy/ocean themed)
```

## Key Patterns
- See `.claude/rules/frontend.md` for all coding conventions
- MUI sx prop for all styling — no CSS files
- Native fetch only — no axios
- sessionStorage for player token persistence
- Short polling (1.5s) for opponent turn updates
