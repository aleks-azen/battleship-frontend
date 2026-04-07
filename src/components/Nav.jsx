import { Link } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import AnchorIcon from '@mui/icons-material/Anchor';
import HistoryIcon from '@mui/icons-material/History';
import { useTheme } from '@mui/material/styles';

export default function Nav() {
  const theme = useTheme();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: theme.custom.navBg,
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          width: '100%',
          height: 56,
          minHeight: '56px !important',
          px: { xs: 2, md: 4 },
        }}
      >
        <Box
          component={Link}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: '#fff',
            gap: 1,
          }}
        >
          <AnchorIcon sx={{ fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px', fontSize: '18px' }}>
            Battleship
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          component={Link}
          to="/history"
          startIcon={<HistoryIcon />}
          sx={{
            color: 'rgba(255,255,255,0.85)',
            textTransform: 'none',
            fontSize: '13px',
            '&:hover': { color: '#fff' },
          }}
        >
          History
        </Button>
      </Toolbar>
    </AppBar>
  );
}
