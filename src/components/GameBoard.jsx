import { Fragment } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import Cell from './Cell';
import { BOARD_SIZE, ROW_LABELS, COL_LABELS, CELL_STATES } from '../content/game';

const CELL_PX = { xs: 28, sm: 34, md: 38 };
const LABEL_PX = { xs: 20, sm: 24, md: 28 };

export default function GameBoard({
  board,
  shipTypeMap,
  flashCells,
  onCellClick,
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

      <Box
        sx={{
          display: 'inline-grid',
          gridTemplateColumns: {
            xs: `${LABEL_PX.xs}px repeat(${BOARD_SIZE}, ${CELL_PX.xs}px)`,
            sm: `${LABEL_PX.sm}px repeat(${BOARD_SIZE}, ${CELL_PX.sm}px)`,
            md: `${LABEL_PX.md}px repeat(${BOARD_SIZE}, ${CELL_PX.md}px)`,
          },
          alignItems: 'center',
          bgcolor: theme.custom.boardBg,
          borderRadius: 1,
          p: 0.5,
        }}
      >
        {/* Corner spacer */}
        <Box />

        {/* Column labels */}
        {COL_LABELS.map((label) => (
          <Box
            key={label}
            sx={{
              textAlign: 'center',
              fontSize: { xs: '10px', sm: '11px', md: '12px' },
              fontWeight: 700,
              color: theme.custom.labelColor,
              lineHeight: 2,
            }}
          >
            {label}
          </Box>
        ))}

        {/* Rows: label + cells */}
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <Fragment key={row}>
            <Box
              sx={{
                textAlign: 'center',
                fontSize: { xs: '10px', sm: '11px', md: '12px' },
                fontWeight: 700,
                color: theme.custom.labelColor,
              }}
            >
              {ROW_LABELS[row]}
            </Box>
            {Array.from({ length: BOARD_SIZE }, (_, col) => (
              <Cell
                key={col}
                row={row}
                col={col}
                state={getCellState(row, col)}
                shipType={shipTypeMap?.[row]?.[col] || null}
                flash={flashCells?.[row]?.[col] || false}
                onClick={onCellClick}
                onMouseEnter={onCellHover}
                onMouseLeave={onCellLeave}
              />
            ))}
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}
