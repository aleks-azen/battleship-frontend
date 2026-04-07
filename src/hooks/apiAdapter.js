import useApi from './useApi';
import { useCallback } from 'react';
import {
  GAME_MODES,
  GAME_PHASES,
  CELL_STATES,
  BOARD_SIZE,
  SHIPS,
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

function statusToPhase(status, mode) {
  switch (status) {
    case 'PLACING_SHIPS':
      // For multiplayer, show share link + placement UI;
      // for single-player, go straight to placement.
      return mode === 'MULTIPLAYER'
        ? GAME_PHASES.WAITING
        : GAME_PHASES.PLACING;
    case 'IN_PROGRESS':
      return GAME_PHASES.FIRING;
    case 'COMPLETED':
      return GAME_PHASES.GAME_OVER;
    default:
      return GAME_PHASES.WAITING;
  }
}

function coordSet(coords) {
  const set = new Set();
  for (const c of coords) set.add(`${c.row},${c.col}`);
  return set;
}

function shipCells(ship) {
  const size = SHIP_SIZES[ship.type] || 1;
  const cells = [];
  for (let i = 0; i < size; i++) {
    if (ship.orientation === 'HORIZONTAL') {
      cells.push({ row: ship.origin.row, col: ship.origin.col + i });
    } else {
      cells.push({ row: ship.origin.row + i, col: ship.origin.col });
    }
  }
  return cells;
}

function boardViewToGrid(boardView, isPlayer) {
  const grid = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => CELL_STATES.EMPTY)
  );

  const hitSet = coordSet(boardView.hits || []);
  const shotSet = coordSet(boardView.shots || []);

  if (isPlayer && boardView.ships) {
    const sunkCells = new Set();
    for (const ship of boardView.ships) {
      if (ship.sunk) {
        for (const c of shipCells(ship)) sunkCells.add(`${c.row},${c.col}`);
      }
    }
    for (const ship of boardView.ships) {
      for (const c of shipCells(ship)) {
        const key = `${c.row},${c.col}`;
        if (sunkCells.has(key)) {
          grid[c.row][c.col] = CELL_STATES.SUNK;
        } else if (hitSet.has(key)) {
          grid[c.row][c.col] = CELL_STATES.HIT;
        } else {
          grid[c.row][c.col] = CELL_STATES.SHIP;
        }
      }
    }
  }

  for (const shot of boardView.shots || []) {
    const key = `${shot.row},${shot.col}`;
    if (grid[shot.row][shot.col] === CELL_STATES.EMPTY) {
      grid[shot.row][shot.col] = CELL_STATES.MISS;
    }
  }

  if (!isPlayer) {
    for (const hit of boardView.hits || []) {
      grid[hit.row][hit.col] = CELL_STATES.HIT;
    }
  }

  return grid;
}

function extractSunkShips(boardView) {
  if (!boardView.ships) return [];
  return boardView.ships.filter((s) => s.sunk).map((s) => s.type);
}

function adaptGameState(raw) {
  const phase = statusToPhase(raw.status, raw.mode);
  const playerBoard = boardViewToGrid(raw.playerBoard, true);
  const opponentBoard = boardViewToGrid(raw.opponentBoard, false);
  const isMyTurn = raw.currentTurn === 'you';
  const winner = raw.winnerId === 'you' ? WINNER.ME : raw.winnerId === 'opponent' ? WINNER.OPPONENT : null;
  const mode = BACKEND_MODE_TO_FRONTEND[raw.mode] || raw.mode;

  return {
    phase,
    playerBoard,
    opponentBoard,
    isMyTurn,
    winner,
    mode,
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
    async (gameId) => {
      return api.joinGame(gameId);
    },
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
        result: raw.result,
        coordinate: raw.coordinate,
        sunkShip: raw.sunkShip,
        gameOver: raw.gameOver,
        winner: adapted.winner,
        phase: adapted.phase,
        playerBoard: adapted.playerBoard,
        opponentBoard: adapted.opponentBoard,
        isMyTurn: adapted.isMyTurn,
        sunkShips: adapted.sunkShips,
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

  const getHistory = useCallback(() => api.getHistory(), [api]);

  return { createGame, joinGame, placeShips, fire, getGameState, getHistory };
}
