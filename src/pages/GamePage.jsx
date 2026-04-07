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
import useApiAdapter from '../hooks/apiAdapter';
import useGameState, { getStored, setStored } from '../hooks/useGameState';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  GAME_PHASES,
  GAME_MODES,
  BOARD_SIZE,
  SHIPS,
  ORIENTATIONS,
  CELL_STATES,
  WINNER,
  STATUS_MESSAGES,
  PLACEMENT_INSTRUCTIONS,
  SPECTATOR_LABELS,
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

function spectatorLabel(playerNumber, winnerId) {
  const base = SPECTATOR_LABELS[`PLAYER_${playerNumber}`];
  if (!winnerId) return base;
  const suffix = winnerId === playerNumber ? SPECTATOR_LABELS.WINNER : SPECTATOR_LABELS.LOSER;
  return `${base} (${suffix})`;
}

function findPlacementAtCell(placedShips, row, col) {
  return placedShips.find((p) =>
    shipCellCoords(p.row, p.col, p.size, p.orientation).some(([r, c]) => r === row && c === col)
  );
}

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const api = useApiAdapter();
  const {
    phase,
    playerBoard,
    playerShipTypeMap,
    opponentBoard,
    playerToken,
    isMyTurn,
    lastResult,
    winner,
    error,
    sunkShips,
    isAiMode,
    opponentJoined,
    aiShotPending,
    firing,
    isSpectator,
    spectator,
    fireShot,
    submitPlacements,
    setError,
  } = useGameState(gameId);

  const [localBoard, setLocalBoard] = useState(createEmptyBoard);
  const [shipTypeMap, setShipTypeMap] = useState(createEmptyMap);
  const [previewBoard, setPreviewBoard] = useState(null);
  const [placedShips, setPlacedShips] = useState([]);
  const [selectedShip, setSelectedShip] = useState(SHIPS[0]);
  const [orientation, setOrientation] = useState(ORIENTATIONS.HORIZONTAL);
  const [copied, setCopied] = useState(false);
  const [placementSubmitted, setPlacementSubmitted] = useState(false);
  const copyTimeoutRef = useRef(null);
  const linkInputRef = useRef(null);

  // Reset local placement state when gameId changes (rematch)
  useEffect(() => {
    setLocalBoard(createEmptyBoard());
    setShipTypeMap(createEmptyMap());
    setPreviewBoard(null);
    setPlacedShips([]);
    setSelectedShip(SHIPS[0]);
    setOrientation(ORIENTATIONS.HORIZONTAL);
    setCopied(false);
    setPlacementSubmitted(false);
  }, [gameId]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const isPlacing = phase === GAME_PHASES.PLACING || phase === GAME_PHASES.WAITING;
  const isFiring = phase === GAME_PHASES.FIRING;
  const isOver = phase === GAME_PHASES.GAME_OVER;

  useEffect(() => {
    if (!isPlacing) return;
    function handleKeyDown(e) {
      if (e.key === 'r' || e.key === 'R') {
        setOrientation((o) =>
          o === ORIENTATIONS.HORIZONTAL ? ORIENTATIONS.VERTICAL : ORIENTATIONS.HORIZONTAL
        );
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlacing]);

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

  const handleBoardClick = useCallback((row, col) => {
    if (!isPlacing) return;

    const existing = findPlacementAtCell(placedShips, row, col);
    if (existing) {
      const { board: newBoard, typeMap: newMap } = removeShipFromBoard(localBoard, shipTypeMap, existing);
      setLocalBoard(newBoard);
      setShipTypeMap(newMap);
      setPreviewBoard(null);
      setPlacedShips(placedShips.filter((p) => p.type !== existing.type));
      if (!selectedShip) {
        setSelectedShip(SHIPS.find((s) => s.type === existing.type) || null);
      }
      return;
    }

    handlePlacementClick(row, col);
  }, [isPlacing, handlePlacementClick, placedShips, localBoard, shipTypeMap, selectedShip]);

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
    setPlacementSubmitted(true);
    submitPlacements(placements);
  }, [placedShips, submitPlacements]);

  // Reset placement submitted state if submission fails
  useEffect(() => {
    if (error && placementSubmitted) {
      setPlacementSubmitted(false);
    }
  }, [error, placementSubmitted]);

  const handleFire = useCallback((row, col) => {
    fireShot(row, col);
  }, [fireShot]);

  const joinUrl = `${window.location.origin}/game/${gameId}/join`;

  const markCopied = useCallback(() => {
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleCopyLink = useCallback(() => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(joinUrl).then(markCopied).catch(() => {});
    } else if (linkInputRef.current) {
      linkInputRef.current.select();
      linkInputRef.current.setSelectionRange(0, linkInputRef.current.value.length);
      document.execCommand('copy');
      markCopied();
    }
  }, [joinUrl, markCopied]);

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
      setError(err.message);
    }
  }, [gameId, api, navigate, setError]);

  const displayBoard = previewBoard || localBoard;

  if (isSpectator) {
    const isGameOver = spectator?.phase === GAME_PHASES.GAME_OVER;
    const p1Label = spectatorLabel(1, spectator?.winnerId);
    const p2Label = spectatorLabel(2, spectator?.winnerId);

    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            textAlign: 'center',
            py: 1.5,
            px: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <VisibilityIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '16px', color: 'primary.main' }}>
              {SPECTATOR_LABELS.SPECTATING}
            </Typography>
          </Box>
          {!isGameOver && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {SPECTATOR_LABELS.IN_PROGRESS}
              {spectator?.currentTurn === 1 && ` — ${SPECTATOR_LABELS.PLAYER_1}'s turn`}
              {spectator?.currentTurn === 2 && ` — ${SPECTATOR_LABELS.PLAYER_2}'s turn`}
            </Typography>
          )}
        </Box>

        {spectator && (
          <>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 4,
                justifyContent: 'center',
                alignItems: { xs: 'center', md: 'flex-start' },
              }}
            >
              <GameBoard
                board={spectator.player1Board}
                shipTypeMap={spectator.player1TypeMap}
                showShips={isGameOver}
                title={p1Label}
              />
              <GameBoard
                board={spectator.player2Board}
                shipTypeMap={spectator.player2TypeMap}
                showShips={isGameOver}
                title={p2Label}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Back to Menu
              </Button>
            </Box>
          </>
        )}

        {!spectator && !error && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Loading game...
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

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
        statusMessage={
          isAiMode && phase === GAME_PHASES.WAITING ? STATUS_MESSAGES[GAME_PHASES.PLACING]
          : opponentJoined && phase === GAME_PHASES.WAITING ? STATUS_MESSAGES.WAITING_FOR_PLACEMENT
          : undefined
        }
      />

      {phase === GAME_PHASES.WAITING && !isAiMode && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Share this link with your opponent:
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            <Box
              component="input"
              ref={linkInputRef}
              readOnly
              value={joinUrl}
              onClick={(e) => e.target.setSelectionRange(0, e.target.value.length)}
              sx={{
                width: { xs: '260px', sm: '380px' },
                px: 1.5,
                py: 0.75,
                fontSize: '13px',
                fontFamily: 'monospace',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
                color: 'text.primary',
                outline: 'none',
                '&:focus': { borderColor: 'primary.main' },
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleCopyLink}
              sx={{ textTransform: 'none', fontSize: '13px', minWidth: 'auto', px: 1.5 }}
            >
              {copied ? 'Copied!' : <ContentCopyIcon fontSize="small" />}
            </Button>
          </Box>
        </Box>
      )}

      {isPlacing && isAiMode && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
          <SmartToyIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Playing against AI
          </Typography>
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
            onCellClick={handleBoardClick}
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
            <Box sx={{ px: 0.5 }}>
              {PLACEMENT_INSTRUCTIONS.map((text, i) => (
                <Typography
                  key={i}
                  variant="caption"
                  sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.6 }}
                >
                  {`${i + 1}. ${text}`}
                </Typography>
              ))}
            </Box>
            <Button
              variant="contained"
              disabled={placedShips.length !== SHIPS.length || placementSubmitted}
              onClick={handleSubmit}
              sx={{ textTransform: 'none', fontWeight: 700, mt: 1 }}
            >
              {placementSubmitted && !isAiMode ? 'Waiting for opponent...' : 'Confirm Placement'}
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
            <GameBoard board={playerBoard} shipTypeMap={playerShipTypeMap} showShips title="Your Fleet" />
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
              <GameBoard board={playerBoard} shipTypeMap={playerShipTypeMap} showShips title="Your Fleet" />
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
