import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import useApi from '../hooks/useApi';
import { setStored } from '../hooks/useGameState';
import { GAME_MODES } from '../content/game';

export default function JoinPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const [error, setError] = useState(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!gameId || joinedRef.current) return;
    joinedRef.current = true;

    let mounted = true;
    api
      .joinGame(gameId)
      .then((result) => {
        if (!mounted) return;
        if (result.playerToken) {
          setStored(gameId, 'token', result.playerToken);
        }
        setStored(gameId, 'mode', GAME_MODES.MULTIPLAYER);
        navigate(`/game/${gameId}`, { replace: true });
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message);
      });

    return () => { mounted = false; };
  }, [gameId, api, navigate]);

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      {!error && (
        <>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Joining game...
          </Typography>
        </>
      )}

      {error && (
        <>
          <Alert severity="error" sx={{ mb: 3, maxWidth: 420, width: '100%' }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back to Menu
          </Button>
        </>
      )}
    </Box>
  );
}
