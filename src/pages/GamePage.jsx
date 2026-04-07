import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import GameBoard from '../components/GameBoard';
import ShipList from '../components/ShipList';
import StatusBar from '../components/StatusBar';
import useApi from '../hooks/useApi';
import useGameState, { getStored, setStored } from '../hooks/useGameState';
import {
  GAME_PHASES,
  GAME_MODES,
  BOARD_SIZE,
  SHIPS,
  ORIENTATIONS,
  CELL_STATES,
  WINNER,
} from '../content/game';

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => CELL_STATES.EMPTY)
  );
}

function createEmptyMap() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

function shipCellCoords(row, col, size, orientation) {
  const coords = [];
  for (let i = 0; i < size; i++) {
    coords.push([
      orientation === ORIENTATIONS.VERTICAL ? row + i : row,
      orientation === ORIENTATIONS.HORIZONTAL ? col + i : col,
    ]);
  }
  return coords;
}

function canPlaceShip(board, row, col, size, orientation) {
  for (const [r, c] of shipCellCoords(row, col, size, orientation)) {
    if (r >= BOARD_SIZE || c >= BOARD_SIZE) return false;
    if (board[r][c] === CELL_STATES.SHIP) return false;
  }
  return true;
}

function placeShipOnBoard(board, typeMap, placement) {
  const { row, col, size, orientation, type } = placement;
  const newBoard = board.map((r) => [...r]);
  const newMap = typeMap.map((r) => [...r]);
  for (const [r, c] of shipCellCoords(row, col, size, orientation)) {
    newBoard[r][c] = CELL_STATES.SHIP;
    newMap[r][c] = type;
  }
  return { board: newBoard, typeMap: newMap };
}

function removeShipFromBoard(board, typeMap, placement) {
  const newBoard = board.map((r) => [...r]);
  const newMap = typeMap.map((r) => [...r]);
  for (const [r, c] of shipCellCoords(placement.row, placement.col, placement.size, placement.orientation)) {
    newBoard[r][c] = CELL_STATES.EMPTY;
    newMap[r][c] = null;
  }
  return { board: newBoard, typeMap: newMap };
}

function applyPreview(board, row, col, size, orientation) {
  const newBoard = board.map((r) => [...r]);
  const valid = canPlaceShip(board, row, col, size, orientation);
  for (const [r, c] of shipCellCoords(row, col, size, orientation)) {
    if (r >= BOARD_SIZE || c >= BOARD_SIZE) continue;
    if (newBoard[r][c] === CELL_STATES.EMPTY) {
      newBoard[r][c] = valid ? CELL_STATES.PREVIEW_VALID : CELL_STATES.PREVIEW_INVALID;
    }
  }
  return newBoard;
}

function findPlacementAtCell(placedShips, row, col) {
  return placedShips.find((p) =>
    shipCellCoords(p.row, p.col, p.size, p.orientation).some(([r, c]) => r === row && c === col)
  );
}

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const gameState = useGameState(gameId);
  const {
    phase,
    playerBoard,
    opponentBoard,
    isMyTurn,
    lastResult,
    winner,
    error,
    sunkShips,
    isAiMode,
    aiShotPending,
    firing,
    fireShot,
    submitPlacements,
  } = gameState;

  const [localBoard, setLocalBoard] = useState(createEmptyBoard);
  const [shipTypeMap, setShipTypeMap] = useState(createEmptyMap);
  const [previewBoard, setPreviewBoard] = useState(null);
  const [placedShips, setPlacedShips] = useState([]);
  const [selectedShip, setSelectedShip] = useState(SHIPS[0]);
  const [orientation, setOrientation] = useState(ORIENTATIONS.HORIZONTAL);
  const [copied, setCopied] = useState(false);
  const [flashCells, setFlashCells] = useState(null);
  const flashTimerRef = useRef(null);
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const isPlacing = phase === GAME_PHASES.PLACING || phase === GAME_PHASES.WAITING;
  const isFiring = phase === GAME_PHASES.FIRING;
  const isOver = phase === GAME_PHASES.GAME_OVER;

  const triggerFlash = useCallback((cells) => {
    const flash = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => false)
    );
    cells.forEach(([r, c]) => { flash[r][c] = true; });
    setFlashCells(flash);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashCells(null), 400);
  }, []);

  const handlePlacementClick = useCallback((row, col) => {
    if (!selectedShip) return;
    if (placedShips.some((p) => p.type === selectedShip.type)) return;
    if (!canPlaceShip(localBoard, row, col, selectedShip.size, orientation)) return;

    const newPlacement = {
      type: selectedShip.type,
      row,
      col,
      size: selectedShip.size,
      orientation,
    };
    const { board: newBoard, typeMap: newMap } = placeShipOnBoard(localBoard, shipTypeMap, newPlacement);
    setLocalBoard(newBoard);
    setShipTypeMap(newMap);
    setPreviewBoard(null);

    const newPlacements = [...placedShips, newPlacement];
    setPlacedShips(newPlacements);

    const nextShip = SHIPS.find((s) => !newPlacements.some((p) => p.type === s.type));
    setSelectedShip(nextShip || null);
  }, [selectedShip, placedShips, localBoard, shipTypeMap, orientation]);

  const handlePlacementRightClick = useCallback((row, col) => {
    const placement = findPlacementAtCell(placedShips, row, col);
    if (!placement) return;

    const { board: newBoard, typeMap: newMap } = removeShipFromBoard(localBoard, shipTypeMap, placement);
    setLocalBoard(newBoard);
    setShipTypeMap(newMap);
    setPreviewBoard(null);
    setPlacedShips(placedShips.filter((p) => p.type !== placement.type));
    if (!selectedShip) {
      setSelectedShip(SHIPS.find((s) => s.type === placement.type) || null);
    }
  }, [placedShips, localBoard, shipTypeMap, selectedShip]);

  const handleBoardClick = useCallback((row, col) => {
    if (!isPlacing) return;

    const existing = findPlacementAtCell(placedShips, row, col);
    if (existing) {
      const newOri = existing.orientation === ORIENTATIONS.HORIZONTAL
        ? ORIENTATIONS.VERTICAL
        : ORIENTATIONS.HORIZONTAL;
      const { board: boardWithout, typeMap: mapWithout } = removeShipFromBoard(localBoard, shipTypeMap, existing);
      if (canPlaceShip(boardWithout, existing.row, existing.col, existing.size, newOri)) {
        const rotated = { ...existing, orientation: newOri };
        const { board: newBoard, typeMap: newMap } = placeShipOnBoard(boardWithout, mapWithout, rotated);
        setLocalBoard(newBoard);
        setShipTypeMap(newMap);
        setPlacedShips(
          placedShips.map((p) => p.type === existing.type ? rotated : p)
        );
        setPreviewBoard(null);
      } else {
        triggerFlash(shipCellCoords(existing.row, existing.col, existing.size, existing.orientation));
      }
      return;
    }

    handlePlacementClick(row, col);
  }, [isPlacing, handlePlacementClick, placedShips, localBoard, shipTypeMap, triggerFlash]);

  const handleHover = useCallback((row, col) => {
    if (!isPlacing || !selectedShip) return;
    if (placedShips.some((p) => p.type === selectedShip.type)) return;
    setPreviewBoard(applyPreview(localBoard, row, col, selectedShip.size, orientation));
  }, [isPlacing, selectedShip, placedShips, localBoard, orientation]);

  const handleLeave = useCallback(() => {
    setPreviewBoard(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (placedShips.length !== SHIPS.length) return;
    const placements = placedShips.map(({ type, row, col, orientation }) => ({
      type,
      start: { row, col },
      orientation,
    }));
    submitPlacements(placements);
  }, [placedShips, submitPlacements]);

  const handleFire = useCallback((row, col) => {
    fireShot(row, col);
  }, [fireShot]);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/game/${gameId}/join`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [gameId]);

  const handleRematch = useCallback(async () => {
    const mode = getStored(gameId, 'mode') || GAME_MODES.AI;
    try {
      const result = await api.createGame(mode);
      if (result.playerToken) {
        setStored(result.gameId, 'token', result.playerToken);
      }
      setStored(result.gameId, 'mode', mode);
      navigate(`/game/${result.gameId}`);
    } catch (err) {
      gameState.setError(err.message);
    }
  }, [gameId, api, navigate, gameState]);

  const displayBoard = previewBoard || localBoard;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <StatusBar
        phase={phase}
        isMyTurn={isMyTurn}
        lastResult={lastResult}
        sunkShips={sunkShips}
        winner={winner}
      />

      {phase === GAME_PHASES.WAITING && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Share this link with your opponent:
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopyLink}
            sx={{ textTransform: 'none', fontSize: '13px' }}
          >
            {copied ? 'Copied!' : `${window.location.origin}/game/${gameId}/join`}
          </Button>
        </Box>
      )}

      {/* Placement phase */}
      {isPlacing && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            mt: 3,
            alignItems: { xs: 'center', md: 'flex-start' },
          }}
        >
          <GameBoard
            board={displayBoard}
            shipTypeMap={shipTypeMap}
            flashCells={flashCells}
            onCellClick={handleBoardClick}
            onCellRightClick={handlePlacementRightClick}
            onCellHover={handleHover}
            onCellLeave={handleLeave}
            showShips
            title="Your Board"
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ShipList
              selectedShip={selectedShip}
              onSelectShip={setSelectedShip}
              placedShips={placedShips}
              orientation={orientation}
              onToggleOrientation={() =>
                setOrientation((o) =>
                  o === ORIENTATIONS.HORIZONTAL ? ORIENTATIONS.VERTICAL : ORIENTATIONS.HORIZONTAL
                )
              }
            />
            <Button
              variant="contained"
              disabled={placedShips.length !== SHIPS.length}
              onClick={handleSubmit}
              sx={{ textTransform: 'none', fontWeight: 700, mt: 1 }}
            >
              Confirm Placement
            </Button>
          </Box>
        </Box>
      )}

      {/* Firing phase */}
      {isFiring && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 4,
            mt: 3,
            justifyContent: 'center',
            alignItems: { xs: 'center', md: 'flex-start' },
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <GameBoard board={playerBoard} showShips title="Your Fleet" />
            {aiShotPending && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  mt: 1,
                  color: 'secondary.main',
                  fontWeight: 600,
                }}
              >
                AI is firing...
              </Typography>
            )}
          </Box>
          <Box>
            <GameBoard
              board={opponentBoard}
              onCellClick={isMyTurn && !firing ? handleFire : undefined}
              showShips={false}
              title="Enemy Waters"
            />
            {!isMyTurn && !isAiMode && (
              <Typography
                variant="body2"
                sx={{ textAlign: 'center', mt: 1, color: 'text.secondary', fontStyle: 'italic' }}
              >
                Waiting for opponent...
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Game over overlay */}
      {isOver && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Paper
            elevation={8}
            sx={{
              p: 4,
              maxWidth: 900,
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              textAlign: 'center',
              borderRadius: 3,
            }}
          >
            <Box sx={{ mb: 3 }}>
              {winner === WINNER.ME ? (
                <EmojiEventsIcon sx={{ fontSize: 64, color: '#ffc107' }} />
              ) : (
                <SentimentVeryDissatisfiedIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
              )}
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  mt: 1,
                  color: winner === WINNER.ME ? '#ffc107' : 'error.main',
                }}
              >
                {winner === WINNER.ME ? 'Victory!' : 'Defeat!'}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                {winner === WINNER.ME
                  ? 'You sank all enemy ships!'
                  : 'Your fleet has been destroyed.'}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3,
                justifyContent: 'center',
                alignItems: { xs: 'center', md: 'flex-start' },
                mb: 3,
              }}
            >
              <GameBoard board={playerBoard} showShips title="Your Fleet" />
              <GameBoard board={opponentBoard} showShips title="Enemy Fleet" />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleRematch}
                sx={{ textTransform: 'none', fontWeight: 700, px: 4 }}
              >
                Rematch
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/')}
                sx={{ textTransform: 'none', fontWeight: 700, px: 4 }}
              >
                Back to Menu
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
