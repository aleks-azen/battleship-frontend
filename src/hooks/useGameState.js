import { useState, useEffect, useRef, useCallback } from 'react';
import useApi from './useApi';
import { GAME_PHASES, BOARD_SIZE } from '../content/game';

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 'empty')
  );
}

function getStoredToken(gameId) {
  try {
    return sessionStorage.getItem(`battleship-token-${gameId}`);
  } catch {
    return null;
  }
}

function storeToken(gameId, token) {
  try {
    sessionStorage.setItem(`battleship-token-${gameId}`, token);
  } catch {
    // sessionStorage not available
  }
}

export default function useGameState(gameId) {
  const api = useApi();
  const [phase, setPhase] = useState(GAME_PHASES.WAITING);
  const [playerBoard, setPlayerBoard] = useState(createEmptyBoard);
  const [opponentBoard, setOpponentBoard] = useState(createEmptyBoard);
  const [playerToken, setPlayerToken] = useState(() => getStoredToken(gameId));
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [winner, setWinner] = useState(null);
  const [error, setError] = useState(null);
  const [sunkShips, setSunkShips] = useState({ mine: [], theirs: [] });
  const updatedAtRef = useRef(null);
  const pollingRef = useRef(null);

  const saveToken = useCallback((token) => {
    setPlayerToken(token);
    if (gameId) storeToken(gameId, token);
  }, [gameId]);

  const pollGameState = useCallback(async () => {
    if (!gameId || !playerToken) return;
    try {
      const state = await api.getGameState(gameId, playerToken);
      if (state.updatedAt === updatedAtRef.current) return;
      updatedAtRef.current = state.updatedAt;

      if (state.playerBoard) setPlayerBoard(state.playerBoard);
      if (state.opponentBoard) setOpponentBoard(state.opponentBoard);
      if (state.phase) setPhase(state.phase);
      if (state.isMyTurn !== undefined) setIsMyTurn(state.isMyTurn);
      if (state.winner) setWinner(state.winner);
      if (state.sunkShips) setSunkShips(state.sunkShips);
      if (state.lastResult) setLastResult(state.lastResult);
    } catch (err) {
      setError(err.message);
    }
  }, [gameId, playerToken, api]);

  useEffect(() => {
    if (!gameId || !playerToken) return;

    const shouldPoll =
      phase === GAME_PHASES.WAITING ||
      phase === GAME_PHASES.PLACING ||
      (phase === GAME_PHASES.FIRING && !isMyTurn);

    if (shouldPoll) {
      pollGameState();
      pollingRef.current = setInterval(pollGameState, 1500);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [phase, isMyTurn, gameId, playerToken, pollGameState]);

  const fireShot = useCallback(async (row, col) => {
    if (!isMyTurn || phase !== GAME_PHASES.FIRING) return;
    try {
      const result = await api.fire(gameId, row, col, playerToken);
      setLastResult(result);
      if (result.opponentBoard) setOpponentBoard(result.opponentBoard);
      if (result.phase) setPhase(result.phase);
      if (result.isMyTurn !== undefined) setIsMyTurn(result.isMyTurn);
      if (result.winner) setWinner(result.winner);
      if (result.sunkShips) setSunkShips(result.sunkShips);
    } catch (err) {
      setError(err.message);
    }
  }, [gameId, playerToken, isMyTurn, phase, api]);

  const submitPlacements = useCallback(async (placements) => {
    try {
      const result = await api.placeShips(gameId, placements, playerToken);
      if (result.phase) setPhase(result.phase);
      if (result.playerBoard) setPlayerBoard(result.playerBoard);
      if (result.isMyTurn !== undefined) setIsMyTurn(result.isMyTurn);
    } catch (err) {
      setError(err.message);
    }
  }, [gameId, playerToken, api]);

  return {
    phase,
    playerBoard,
    opponentBoard,
    playerToken,
    isMyTurn,
    lastResult,
    winner,
    error,
    sunkShips,
    saveToken,
    fireShot,
    submitPlacements,
    setPhase,
    setPlayerBoard,
    setError,
  };
}
