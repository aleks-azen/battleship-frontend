import { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GameBoard from '../components/GameBoard';
import ShipList from '../components/ShipList';
import StatusBar from '../components/StatusBar';
import useGameState from '../hooks/useGameState';
import {
  GAME_PHASES,
  BOARD_SIZE,
  SHIPS,
  ORIENTATIONS,
  CELL_STATES,
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

function canPlaceShip(board, row, col, size, orientation) {
  for (let i = 0; i < size; i++) {
    const r = orientation === ORIENTATIONS.VERTICAL ? row + i : row;
    const c = orientation === ORIENTATIONS.HORIZONTAL ? col + i : col;
    if (r >= BOARD_SIZE || c >= BOARD_SIZE) return false;
    if (board[r][c] === CELL_STATES.SHIP) return false;
  }
  return true;
}

function placeShipOnBoard(board, typeMap, row, col, size, orientation, shipType) {
  const newBoard = board.map((r) => [...r]);
  const newMap = typeMap.map((r) => [...r]);
  for (let i = 0; i < size; i++) {
    const r = orientation === ORIENTATIONS.VERTICAL ? row + i : row;
    const c = orientation === ORIENTATIONS.HORIZONTAL ? col + i : col;
    newBoard[r][c] = CELL_STATES.SHIP;
    newMap[r][c] = shipType;
  }
  return { board: newBoard, typeMap: newMap };
}

function removeShipFromBoard(board, typeMap, placement) {
  const newBoard = board.map((r) => [...r]);
  const newMap = typeMap.map((r) => [...r]);
  for (let i = 0; i < placement.size; i++) {
    const r = placement.orientation === ORIENTATIONS.VERTICAL ? placement.row + i : placement.row;
    const c = placement.orientation === ORIENTATIONS.HORIZONTAL ? placement.col + i : placement.col;
    newBoard[r][c] = CELL_STATES.EMPTY;
    newMap[r][c] = null;
  }
  return { board: newBoard, typeMap: newMap };
}

function applyPreview(board, row, col, size, orientation) {
  const newBoard = board.map((r) => [...r]);
  const valid = canPlaceShip(board, row, col, size, orientation);
  for (let i = 0; i < size; i++) {
    const r = orientation === ORIENTATIONS.VERTICAL ? row + i : row;
    const c = orientation === ORIENTATIONS.HORIZONTAL ? col + i : col;
    if (r >= BOARD_SIZE || c >= BOARD_SIZE) continue;
    if (newBoard[r][c] === CELL_STATES.EMPTY) {
      newBoard[r][c] = valid ? CELL_STATES.PREVIEW_VALID : CELL_STATES.PREVIEW_INVALID;
    }
  }
  return newBoard;
}

function clearPreview(board) {
  return board.map((row) =>
    row.map((cell) =>
      cell === CELL_STATES.PREVIEW_VALID || cell === CELL_STATES.PREVIEW_INVALID
        ? CELL_STATES.EMPTY
        : cell
    )
  );
}

function getShipCells(placement) {
  const cells = [];
  for (let i = 0; i < placement.size; i++) {
    const r = placement.orientation === ORIENTATIONS.VERTICAL ? placement.row + i : placement.row;
    const c = placement.orientation === ORIENTATIONS.HORIZONTAL ? placement.col + i : placement.col;
    cells.push([r, c]);
  }
  return cells;
}

function findPlacementAtCell(placedShips, row, col) {
  return placedShips.find((p) => {
    for (let i = 0; i < p.size; i++) {
      const r = p.orientation === ORIENTATIONS.VERTICAL ? p.row + i : p.row;
      const c = p.orientation === ORIENTATIONS.HORIZONTAL ? p.col + i : p.col;
      if (r === row && c === col) return true;
    }
    return false;
  });
}

export default function GamePage() {
  const { gameId } = useParams();
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
    const placedTypes = placedShips.map((p) => p.type);
    if (placedTypes.includes(selectedShip.type)) return;
    if (!canPlaceShip(localBoard, row, col, selectedShip.size, orientation)) return;

    const { board: newBoard, typeMap: newMap } = placeShipOnBoard(
      localBoard, shipTypeMap, row, col, selectedShip.size, orientation, selectedShip.type
    );
    setLocalBoard(newBoard);
    setShipTypeMap(newMap);
    setPreviewBoard(null);

    const newPlacement = {
      type: selectedShip.type,
      row,
      col,
      size: selectedShip.size,
      orientation,
    };
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
        const { board: newBoard, typeMap: newMap } = placeShipOnBoard(
          boardWithout, mapWithout, existing.row, existing.col, existing.size, newOri, existing.type
        );
        setLocalBoard(newBoard);
        setShipTypeMap(newMap);
        setPlacedShips(
          placedShips.map((p) =>
            p.type === existing.type ? { ...p, orientation: newOri } : p
          )
        );
        setPreviewBoard(null);
      } else {
        triggerFlash(getShipCells(existing));
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
    if (!isMyTurn || !isFiring) return;
    fireShot(row, col);
  }, [isMyTurn, isFiring, fireShot]);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/game/${gameId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [gameId]);

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
            {copied ? 'Copied!' : `${window.location.origin}/game/${gameId}`}
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
          <GameBoard board={playerBoard} showShips title="Your Fleet" />
          <GameBoard
            board={opponentBoard}
            onCellClick={isMyTurn ? handleFire : undefined}
            showShips={false}
            title="Enemy Waters"
          />
        </Box>
      )}

      {/* Game over */}
      {isOver && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
              justifyContent: 'center',
              alignItems: { xs: 'center', md: 'flex-start' },
              mb: 3,
            }}
          >
            <GameBoard board={playerBoard} showShips title="Your Fleet" />
            <GameBoard board={opponentBoard} showShips title="Enemy Fleet" />
          </Box>
          <Button
            variant="contained"
            onClick={() => (window.location.href = '/')}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            New Game
          </Button>
        </Box>
      )}
    </Box>
  );
}
