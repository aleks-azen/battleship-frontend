import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import GroupIcon from '@mui/icons-material/Group';
import AnchorIcon from '@mui/icons-material/Anchor';
import useApi from '../hooks/useApi';

export default function HomePage() {
  const navigate = useNavigate();
  const api = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [joinId, setJoinId] = useState('');

  async function handleCreate(mode) {
    setLoading(true);
    setError(null);
    try {
      const result = await api.createGame(mode);
      const token = result.playerToken;
      if (token) {
        sessionStorage.setItem(`battleship-token-${result.gameId}`, token);
      }
      navigate(`/game/${result.gameId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!joinId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.joinGame(joinId.trim());
      const token = result.playerToken;
      if (token) {
        sessionStorage.setItem(`battleship-token-${joinId.trim()}`, token);
      }
      navigate(`/game/${joinId.trim()}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
      }}
    >
      <AnchorIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, textAlign: 'center' }}>
        Battleship
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, textAlign: 'center' }}>
        Command your fleet. Sink the enemy.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, maxWidth: 420, width: '100%' }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, mb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            width: { xs: '100%', sm: 220 },
          }}
        >
          <SmartToyIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '16px' }}>
            vs AI
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '13px' }}>
            Play against the computer
          </Typography>
          <Button
            variant="contained"
            fullWidth
            disabled={loading}
            onClick={() => handleCreate('AI')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={22} /> : 'Start Game'}
          </Button>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            width: { xs: '100%', sm: 220 },
          }}
        >
          <GroupIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '16px' }}>
            vs Human
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '13px' }}>
            Play against a friend
          </Typography>
          <Button
            variant="contained"
            fullWidth
            disabled={loading}
            onClick={() => handleCreate('MULTIPLAYER')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={22} /> : 'Create Game'}
          </Button>
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          maxWidth: 420,
          width: '100%',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          Join a game
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Enter game ID"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            fullWidth
            sx={{ '& .MuiInputBase-input': { fontSize: '14px' } }}
          />
          <Button
            variant="outlined"
            disabled={loading || !joinId.trim()}
            onClick={handleJoin}
            sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Join
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
