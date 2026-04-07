import useApi from './useApi';
import { useCallback } from 'react';
import {
  GAME_MODES,
  GAME_PHASES,
  CELL_STATES,
  BOARD_SIZE,
  SHIPS,
  ORIENTATIONS,
  WINNER,
} from '../content/game';

const SHIP_SIZES = Object.fromEntries(SHIPS.map((s) => [s.type, s.size]));

const MODE_TO_BACKEND = {
  [GAME_MODES.AI]: 'SINGLE_PLAYER',
  [GAME_MODES.MULTIPLAYER]: 'MULTIPLAYER',
};

const BACKEND_MODE_TO_FRONTEND = {
  SINGLE_PLAYER: GAME_MODES.AI,
  MULTIPLAYER: GAME_MODES.MULTIPLAYER,
};

const BACKEND_STATUS = {
  PLACING_SHIPS: 'PLACING_SHIPS',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

const BACKEND_TURN = {
  SELF: 'you',
  OPPONENT: 'opponent',
};

const WINNER_MAP = {
  [BACKEND_TURN.SELF]: WINNER.ME,
  [BACKEND_TURN.OPPONENT]: WINNER.OPPONENT,
};

function statusToPhase(status, mode) {
  switch (status) {
    case BACKEND_STATUS.PLACING_SHIPS:
      // Multiplayer keeps share-link visible during placement
      return mode === GAME_MODES.MULTIPLAYER
        ? GAME_PHASES.WAITING
        : GAME_PHASES.PLACING;
    case BACKEND_STATUS.IN_PROGRESS:
      return GAME_PHASES.FIRING;
    case BACKEND_STATUS.COMPLETED:
      return GAME_PHASES.GAME_OVER;
    default:
      return GAME_PHASES.WAITING;
  }
}

function coordKey(row, col) {
  return `${row},${col}`;
}

function coordSet(coords) {
  const set = new Set();
  for (const c of coords) set.add(coordKey(c.row, c.col));
  return set;
}

function shipCells(ship) {
  const size = SHIP_SIZES[ship.type] || 1;
  const cells = [];
  for (let i = 0; i < size; i++) {
    if (ship.orientation === ORIENTATIONS.HORIZONTAL) {
      cells.push({ row: ship.origin.row, col: ship.origin.col + i });
    } else {
      cells.push({ row: ship.origin.row + i, col: ship.origin.col });
    }
  }
  return cells;
}

function emptyGrid() {
  return {
    grid: Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => CELL_STATES.EMPTY)
    ),
    typeMap: null,
  };
}

function boardViewToGrid(boardView, isPlayer) {
  if (!boardView) return emptyGrid();

  const grid = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => CELL_STATES.EMPTY)
  );

  const hits = boardView.hits || [];
  const shots = boardView.shots || [];
  let typeMap = null;

  // Player board: mark ship cells (sunk > hit > ship) and build typeMap
  if (isPlayer && boardView.ships) {
    typeMap = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => null)
    );
    const hitSet = coordSet(hits);
    for (const ship of boardView.ships) {
      const state = ship.sunk ? CELL_STATES.SUNK : null;
      for (const c of shipCells(ship)) {
        const key = coordKey(c.row, c.col);
        typeMap[c.row][c.col] = ship.type;
        if (state) {
          grid[c.row][c.col] = state;
        } else if (hitSet.has(key)) {
          grid[c.row][c.col] = CELL_STATES.HIT;
        } else {
          grid[c.row][c.col] = CELL_STATES.SHIP;
        }
      }
    }
  }

  // Opponent board: mark hits first so the shots loop only adds misses
  if (!isPlayer) {
    for (const hit of hits) {
      grid[hit.row][hit.col] = CELL_STATES.HIT;
    }
  }

  // Mark remaining shots as misses (cells already marked are skipped)
  for (const shot of shots) {
    if (grid[shot.row][shot.col] === CELL_STATES.EMPTY) {
      grid[shot.row][shot.col] = CELL_STATES.MISS;
    }
  }

  return { grid, typeMap };
}

function extractSunkShips(boardView) {
  if (!boardView?.ships) return [];
  return boardView.ships.filter((s) => s.sunk).map((s) => s.type);
}

function adaptSpectatorState(raw) {
  const mode = BACKEND_MODE_TO_FRONTEND[raw.mode] || raw.mode;
  const isCompleted = raw.status === BACKEND_STATUS.COMPLETED;
  const phase = isCompleted ? GAME_PHASES.GAME_OVER : GAME_PHASES.FIRING;

  // Completed: show all ships on both boards. In-progress: only shots/hits.
  const p1 = boardViewToGrid(raw.player1Board, isCompleted);
  const p2 = boardViewToGrid(raw.player2Board, isCompleted);

  return {
    phase,
    player1Board: p1.grid,
    player1TypeMap: p1.typeMap,
    player2Board: p2.grid,
    player2TypeMap: p2.typeMap,
    currentTurn: raw.currentTurn,
    winnerId: raw.winnerId,
    mode,
    updatedAt: raw.updatedAt,
    sunkShips: {
      player1: extractSunkShips(raw.player1Board),
      player2: extractSunkShips(raw.player2Board),
    },
  };
}

function adaptGameState(raw) {
  const mode = BACKEND_MODE_TO_FRONTEND[raw.mode] || raw.mode;
  const phase = statusToPhase(raw.status, mode);
  const player = boardViewToGrid(raw.playerBoard, true);
  const opponent = boardViewToGrid(raw.opponentBoard, false);
  const isMyTurn = raw.currentTurn === BACKEND_TURN.SELF;
  const winner = WINNER_MAP[raw.winnerId] || null;

  return {
    phase,
    playerBoard: player.grid,
    playerShipTypeMap: player.typeMap,
    opponentBoard: opponent.grid,
    isMyTurn,
    winner,
    mode,
    opponentJoined: raw.opponentJoined ?? false,
    updatedAt: raw.updatedAt,
    sunkShips: {
      mine: extractSunkShips(raw.playerBoard),
      theirs: extractSunkShips(raw.opponentBoard),
    },
  };
}

export default function useApiAdapter() {
  const api = useApi();

  const createGame = useCallback(
    async (mode) => {
      const backendMode = MODE_TO_BACKEND[mode] || mode;
      const raw = await api.createGame(backendMode);
      return {
        gameId: raw.gameId,
        playerToken: raw.playerToken,
        playerNumber: raw.playerNumber,
        mode: BACKEND_MODE_TO_FRONTEND[raw.mode] || raw.mode,
      };
    },
    [api]
  );

  const joinGame = useCallback(
    (gameId) => api.joinGame(gameId),
    [api]
  );

  const placeShips = useCallback(
    async (gameId, placements, playerToken) => {
      const ships = placements.map((p) => ({
        type: p.type,
        row: p.start.row,
        col: p.start.col,
        orientation: p.orientation,
      }));
      await api.placeShips(gameId, ships, playerToken);
      const stateRaw = await api.getGameState(gameId, playerToken);
      return adaptGameState(stateRaw);
    },
    [api]
  );

  const fire = useCallback(
    async (gameId, row, col, playerToken) => {
      const raw = await api.fire(gameId, row, col, playerToken);
      const stateRaw = await api.getGameState(gameId, playerToken);
      const adapted = adaptGameState(stateRaw);

      return {
        ...adapted,
        result: raw.result,
        coordinate: raw.coordinate,
        sunkShip: raw.sunkShip,
        gameOver: raw.gameOver,
        aiShot: raw.aiResult ? raw.aiResult.coordinate : null,
      };
    },
    [api]
  );

  const getGameState = useCallback(
    async (gameId, playerToken) => {
      const raw = await api.getGameState(gameId, playerToken);
      return adaptGameState(raw);
    },
    [api]
  );

  const getSpectatorState = useCallback(
    async (gameId) => {
      const raw = await api.getGameState(gameId, null);
      return adaptSpectatorState(raw);
    },
    [api]
  );

  const getHistory = useCallback(() => api.getHistory(), [api]);

  return { createGame, joinGame, placeShips, fire, getGameState, getSpectatorState, getHistory };
}
