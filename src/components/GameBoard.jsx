import { Fragment } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import Cell from './Cell';
import { BOARD_SIZE, ROW_LABELS, COL_LABELS, CELL_STATES, CELL_SIZE, LABEL_SIZE } from '../content/game';

export default function GameBoard({
  board,
  shipTypeMap,
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
            xs: `${LABEL_SIZE.xs}px repeat(${BOARD_SIZE}, ${CELL_SIZE.xs}px)`,
            sm: `${LABEL_SIZE.sm}px repeat(${BOARD_SIZE}, ${CELL_SIZE.sm}px)`,
            md: `${LABEL_SIZE.md}px repeat(${BOARD_SIZE}, ${CELL_SIZE.md}px)`,
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
