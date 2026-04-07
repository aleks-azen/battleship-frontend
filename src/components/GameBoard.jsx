import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import Cell from './Cell';
import { BOARD_SIZE, ROW_LABELS, COL_LABELS, CELL_STATES } from '../content/game';

const LABEL_SIZE = { xs: 20, sm: 24, md: 28 };

export default function GameBoard({
  board,
  onCellClick,
  onCellRightClick,
  onCellHover,
  onCellLeave,
  showShips = true,
  title,
}) {
  const theme = useTheme();

  function getCellState(row, col) {
    const raw = board?.[row]?.[col] ?? 'empty';
    if (raw === CELL_STATES.SHIP && !showShips) return CELL_STATES.EMPTY;
    return raw;
  }

  return (
    <Box sx={{ display: 'inline-block' }}>
      {title && (
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            textAlign: 'center',
            mb: 1,
            color: 'primary.main',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontSize: '13px',
          }}
        >
          {title}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: theme.custom.boardBg, borderRadius: 1, p: 0.5 }}>
        {/* Column labels */}
        <Box sx={{ display: 'flex', ml: LABEL_SIZE }}>
          {COL_LABELS.map((label) => (
            <Box
              key={label}
              sx={{
                width: { xs: 28, sm: 34, md: 38 },
                textAlign: 'center',
                fontSize: { xs: '10px', sm: '11px', md: '12px' },
                fontWeight: 700,
                color: theme.custom.labelColor,
              }}
            >
              {label}
            </Box>
          ))}
        </Box>

        {/* Rows */}
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <Box key={row} sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Row label */}
            <Box
              sx={{
                width: LABEL_SIZE,
                textAlign: 'center',
                fontSize: { xs: '10px', sm: '11px', md: '12px' },
                fontWeight: 700,
                color: theme.custom.labelColor,
              }}
            >
              {ROW_LABELS[row]}
            </Box>

            {/* Cells */}
            {Array.from({ length: BOARD_SIZE }, (_, col) => (
              <Cell
                key={col}
                row={row}
                col={col}
                state={getCellState(row, col)}
                onClick={onCellClick}
                onContextMenu={onCellRightClick}
                onMouseEnter={onCellHover}
                onMouseLeave={onCellLeave}
              />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
