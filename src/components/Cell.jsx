import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { CELL_STATES } from '../content/game';

const CELL_SIZE = { xs: 28, sm: 34, md: 38 };

function getCellBg(state, cellColors) {
  switch (state) {
    case CELL_STATES.SHIP:
      return cellColors.ship;
    case CELL_STATES.HIT:
      return cellColors.hit;
    case CELL_STATES.MISS:
      return cellColors.miss;
    case CELL_STATES.SUNK:
      return cellColors.sunk;
    case CELL_STATES.PREVIEW_VALID:
      return cellColors.previewValid;
    case CELL_STATES.PREVIEW_INVALID:
      return cellColors.previewInvalid;
    default:
      return cellColors.water;
  }
}

function getCellMarker(state) {
  if (state === CELL_STATES.HIT || state === CELL_STATES.SUNK) return '\u2715';
  if (state === CELL_STATES.MISS) return '\u2022';
  return null;
}

export default function Cell({ row, col, state = CELL_STATES.EMPTY, shipType, flash, onClick, onContextMenu, onMouseEnter, onMouseLeave }) {
  const theme = useTheme();
  const cellColors = theme.custom.cell;
  const marker = getCellMarker(state);

  let bgcolor = getCellBg(state, cellColors);
  if (state === CELL_STATES.SHIP && shipType && theme.custom.shipColors[shipType]) {
    bgcolor = theme.custom.shipColors[shipType];
  }

  return (
    <Box
      onClick={() => onClick?.(row, col)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(row, col);
      }}
      onMouseEnter={() => onMouseEnter?.(row, col)}
      onMouseLeave={() => onMouseLeave?.(row, col)}
      sx={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        bgcolor: flash ? cellColors.flash : bgcolor,
        border: `1px solid ${cellColors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.15s',
        '&:hover': onClick ? { opacity: 0.85 } : {},
        fontSize: { xs: '14px', sm: '16px', md: '18px' },
        fontWeight: 700,
        color: state === CELL_STATES.HIT || state === CELL_STATES.SUNK ? '#fff' : 'text.secondary',
        userSelect: 'none',
      }}
    >
      {marker}
    </Box>
  );
}
