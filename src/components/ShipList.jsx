import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import { SHIPS, ORIENTATIONS } from '../content/game';

export default function ShipList({
  selectedShip,
  onSelectShip,
  placedShips = [],
  orientation,
  onToggleOrientation,
}) {
  const placedTypes = placedShips.map((p) => p.type);

  return (
    <Box sx={{ width: { xs: '100%', sm: 220 } }}>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontSize: '13px',
          color: 'primary.main',
          mb: 1,
        }}
      >
        Your Fleet
      </Typography>

      <Button
        variant="outlined"
        size="small"
        startIcon={<RotateRightIcon />}
        onClick={onToggleOrientation}
        sx={{ mb: 1.5, textTransform: 'none', fontSize: '12px' }}
      >
        {orientation === ORIENTATIONS.HORIZONTAL ? 'Horizontal' : 'Vertical'}
      </Button>

      <List dense disablePadding>
        {SHIPS.map((ship) => {
          const isPlaced = placedTypes.includes(ship.type);
          const isSelected = selectedShip?.type === ship.type;

          return (
            <ListItemButton
              key={ship.type}
              selected={isSelected}
              disabled={isPlaced}
              onClick={() => onSelectShip(ship)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                opacity: isPlaced ? 0.5 : 1,
                bgcolor: isSelected ? 'action.selected' : 'transparent',
              }}
            >
              <ListItemText
                primary={ship.name}
                secondary={`${ship.size} cells`}
                primaryTypographyProps={{
                  fontSize: '14px',
                  fontWeight: isSelected ? 700 : 500,
                  sx: { textDecoration: isPlaced ? 'line-through' : 'none' },
                }}
                secondaryTypographyProps={{ fontSize: '11px' }}
              />
              <Box sx={{ display: 'flex', gap: '2px' }}>
                {Array.from({ length: ship.size }, (_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '2px',
                      bgcolor: isPlaced ? 'action.disabled' : 'secondary.main',
                    }}
                  />
                ))}
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
