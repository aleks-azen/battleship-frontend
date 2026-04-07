import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { GAME_PHASES, STATUS_MESSAGES, WINNER } from '../content/game';

export default function StatusBar({ phase, isMyTurn, lastResult, sunkShips = { mine: [], theirs: [] }, winner, isAiMode }) {
  let message = '';

  if (phase === GAME_PHASES.GAME_OVER) {
    message = winner === WINNER.ME ? STATUS_MESSAGES.WIN : STATUS_MESSAGES.LOSE;
  } else if (phase === GAME_PHASES.FIRING) {
    message = isMyTurn ? STATUS_MESSAGES.YOUR_TURN : STATUS_MESSAGES.OPPONENT_TURN;
  } else if (phase === GAME_PHASES.WAITING && isAiMode) {
    message = STATUS_MESSAGES[GAME_PHASES.PLACING];
  } else {
    message = STATUS_MESSAGES[phase] || '';
  }

  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 1.5,
        px: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '16px', color: 'primary.main' }}>
        {message}
      </Typography>

      {lastResult && (
        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '13px' }}>
          {lastResult.message}
        </Typography>
      )}

      {sunkShips.theirs.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
            Sunk:
          </Typography>
          {sunkShips.theirs.map((name) => (
            <Chip key={name} label={name} size="small" color="error" variant="outlined" sx={{ fontSize: '11px', height: 22 }} />
          ))}
        </Box>
      )}

      {sunkShips.mine.length > 0 && (
        <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
            Lost:
          </Typography>
          {sunkShips.mine.map((name) => (
            <Chip key={name} label={name} size="small" color="default" variant="outlined" sx={{ fontSize: '11px', height: 22 }} />
          ))}
        </Box>
      )}
    </Box>
  );
}
