import { createTheme } from '@mui/material/styles';

const navy = '#1a237e';
const ocean = '#0277bd';
const bg = '#f0f4f8';
const text = '#1a1a2e';
const textSecondary = '#546e7a';
const mode = 'light';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.round(c * (1 - amount)));
  return `#${f(r).toString(16).padStart(2, '0')}${f(g).toString(16).padStart(2, '0')}${f(b).toString(16).padStart(2, '0')}`;
}

function lighten(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.min(255, Math.round(c + (255 - c) * amount));
  return `#${f(r).toString(16).padStart(2, '0')}${f(g).toString(16).padStart(2, '0')}${f(b).toString(16).padStart(2, '0')}`;
}

const theme = createTheme({
  palette: {
    mode,
    background: { default: bg, paper: '#ffffff' },
    text: { primary: text, secondary: textSecondary },
    primary: { main: navy },
    secondary: { main: ocean },
    divider: 'rgba(0,0,0,0.12)',
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: { fontWeight: 800, letterSpacing: '-1px' },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { overflowX: 'hidden' },
      },
    },
  },
  custom: {
    navy,
    ocean,
    cell: {
      water: '#e3f2fd',
      ship: '#78909c',
      hit: '#d32f2f',
      miss: '#b0bec5',
      sunk: '#b71c1c',
      previewValid: rgba(ocean, 0.35),
      previewInvalid: 'rgba(244, 67, 54, 0.35)',
      hover: rgba(ocean, 0.15),
      border: '#bbdefb',
      flash: '#f44336',
    },
    shipColors: {
      CARRIER: '#5c6bc0',
      BATTLESHIP: '#26a69a',
      CRUISER: '#ab47bc',
      SUBMARINE: '#ffa726',
      DESTROYER: '#ef5350',
    },
    navBg: rgba(navy, 0.95),
    boardBg: darken(bg, 0.02),
    labelColor: lighten(navy, 0.3),
  },
});

export default theme;
