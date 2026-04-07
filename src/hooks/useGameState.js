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

function getStoredMode(gameId) {
  try {
    return sessionStorage.getItem(`battleship-mode-${gameId}`);
  } catch {
    return null;
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
  const [gameMode, setGameMode] = useState(() => getStoredMode(gameId));
  const [aiShotPending, setAiShotPending] = useState(null);
  const [firing, setFiring] = useState(false);
  const updatedAtRef = useRef(null);
  const pollingRef = useRef(null);

  const isAiMode = gameMode === 'AI';

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
      if (state.mode && !gameMode) setGameMode(state.mode);
    } catch (err) {
      setError(err.message);
    }
  }, [gameId, playerToken, api, gameMode]);

  useEffect(() => {
    if (!gameId || !playerToken) return;
    if (isAiMode) return;

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
  }, [phase, isMyTurn, gameId, playerToken, pollGameState, isAiMode]);

  const fireShot = useCallback(async (row, col) => {
    if (!isMyTurn || phase !== GAME_PHASES.FIRING || firing) return;
    setFiring(true);
    try {
      const result = await api.fire(gameId, row, col, playerToken);
      setLastResult(result);
      if (result.opponentBoard) setOpponentBoard(result.opponentBoard);
      if (result.sunkShips) setSunkShips(result.sunkShips);

      if (result.gameOver || result.phase === GAME_PHASES.GAME_OVER) {
        setPhase(GAME_PHASES.GAME_OVER);
        if (result.winner) setWinner(result.winner);
        if (result.playerBoard) setPlayerBoard(result.playerBoard);
        setFiring(false);
        return;
      }

      // AI mode: show AI counter-shot with a delay
      if (isAiMode && result.aiShot) {
        setIsMyTurn(false);
        setAiShotPending(result.aiShot);
        setTimeout(() => {
          setAiShotPending(null);
          if (result.playerBoard) setPlayerBoard(result.playerBoard);
          if (result.phase) setPhase(result.phase);
          if (result.isMyTurn !== undefined) setIsMyTurn(result.isMyTurn);
          if (result.winner) setWinner(result.winner);
          setFiring(false);
        }, 500);
      } else {
        if (result.phase) setPhase(result.phase);
        if (result.isMyTurn !== undefined) setIsMyTurn(result.isMyTurn);
        if (result.playerBoard) setPlayerBoard(result.playerBoard);
        setFiring(false);
      }
    } catch (err) {
      setError(err.message);
      setFiring(false);
    }
  }, [gameId, playerToken, isMyTurn, phase, api, isAiMode, firing]);

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
    gameMode,
    isAiMode,
    aiShotPending,
    firing,
    saveToken,
    fireShot,
    submitPlacements,
    setPhase,
    setPlayerBoard,
    setError,
    setGameMode,
  };
}
