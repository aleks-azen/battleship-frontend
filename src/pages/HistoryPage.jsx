import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import useApi from '../hooks/useApi';

export default function HistoryPage() {
  const api = useApi();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getHistory()
      .then(setGames)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [api]);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        Game History
      </Typography>

      {loading && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && games.length === 0 && (
        <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
          No completed games yet.
        </Typography>
      )}

      {!loading && games.length > 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Game</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Result</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.gameId} hover>
                  <TableCell>
                    <Box
                      component={Link}
                      to={`/game/${game.gameId}`}
                      sx={{ color: 'secondary.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {game.gameId.slice(0, 8)}...
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={game.mode || 'AI'}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '11px', height: 22 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={game.result || 'Unknown'}
                      size="small"
                      color={game.result === 'WIN' ? 'success' : game.result === 'LOSE' ? 'error' : 'default'}
                      sx={{ fontSize: '11px', height: 22 }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '13px' }}>
                    {game.completedAt ? new Date(game.completedAt).toLocaleDateString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
