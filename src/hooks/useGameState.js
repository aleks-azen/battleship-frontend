import { useState, useEffect, useRef, useCallback } from 'react';
import useApiAdapter from './apiAdapter';
import { GAME_PHASES, BOARD_SIZE, CELL_STATES, GAME_MODES } from '../content/game';

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => CELL_STATES.EMPTY)
  );
}

export function getStored(gameId, key) {
  try {
    return sessionStorage.getItem(`battleship-${key}-${gameId}`);
  } catch {
    return null;
  }
}

export function setStored(gameId, key, value) {
  try {
    sessionStorage.setItem(`battleship-${key}-${gameId}`, value);
  } catch {
    // sessionStorage not available
  }
}

export default function useGameState(gameId) {
  const api = useApiAdapter();
  const [phase, setPhase] = useState(GAME_PHASES.WAITING);
  const [playerBoard, setPlayerBoard] = useState(createEmptyBoard);
  const [opponentBoard, setOpponentBoard] = useState(createEmptyBoard);
  const [playerToken, setPlayerToken] = useState(() => getStored(gameId, 'token'));
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [winner, setWinner] = useState(null);
  const [error, setError] = useState(null);
  const [sunkShips, setSunkShips] = useState({ mine: [], theirs: [] });
  const [isAiMode, setIsAiMode] = useState(() => getStored(gameId, 'mode') === GAME_MODES.AI);
  const [aiShotPending, setAiShotPending] = useState(null);
  const [firing, setFiring] = useState(false);
  const [playerShipTypeMap, setPlayerShipTypeMap] = useState(null);
  const [spectator, setSpectator] = useState(null);
  const updatedAtRef = useRef(null);
  const pollingRef = useRef(null);
  const firingRef = useRef(false);
  const aiTimerRef = useRef(null);
  const gameModeSetRef = useRef(false);
  const submittingRef = useRef(false);
  const isSpectator = !playerToken;

  const saveToken = useCallback((token) => {
    setPlayerToken(token);
    if (gameId) setStored(gameId, 'token', token);
  }, [gameId]);

  const pollGameState = useCallback(async () => {
    if (!gameId || !playerToken) return;
    try {
      const state = await api.getGameState(gameId, playerToken);
      if (state.updatedAt === updatedAtRef.current) return;
      updatedAtRef.current = state.updatedAt;
      setError(null);

      if (state.playerBoard) setPlayerBoard(state.playerBoard);
      if (state.playerShipTypeMap) setPlayerShipTypeMap(state.playerShipTypeMap);
      if (state.opponentBoard) setOpponentBoard(state.opponentBoard);
      if (state.phase) setPhase(state.phase);
      if (state.isMyTurn !== undefined) setIsMyTurn(state.isMyTurn);
      if (state.winner) setWinner(state.winner);
      if (state.sunkShips) setSunkShips(state.sunkShips);
      if (state.lastResult) setLastResult(state.lastResult);
      if (state.mode && !gameModeSetRef.current) {
        gameModeSetRef.current = true;
        setIsAiMode(state.mode === GAME_MODES.AI);
        setStored(gameId, 'mode', state.mode);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [gameId, playerToken, api]);

  useEffect(() => {
    if (!gameId || !playerToken) return;
    if (isAiMode) return;

    const shouldPoll =
      phase === GAME_PHASES.WAITING ||
      phase === GAME_PHASES.PLACING ||
      (phase === GAME_PHASES.FIRING && !isMyTurn);

    if (shouldPoll) {
      const initialPoll = setTimeout(pollGameState, 0);
      pollingRef.current = setInterval(pollGameState, 1500);

      return () => {
        clearTimeout(initialPoll);
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      };
    }
  }, [phase, isMyTurn, gameId, playerToken, pollGameState, isAiMode]);

  // Spectator polling — stops once game is completed
  useEffect(() => {
    if (!isSpectator || !gameId) return;
    let cancelled = false;
    let interval = null;
    const fetchSpectator = async () => {
      try {
        const state = await api.getSpectatorState(gameId);
        if (cancelled) return;
        if (state.updatedAt === updatedAtRef.current) return;
        updatedAtRef.current = state.updatedAt;
        setSpectator(state);
        setPhase(state.phase);
        setError(null);
        if (state.phase === GAME_PHASES.GAME_OVER && interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    };
    fetchSpectator();
    interval = setInterval(fetchSpectator, 3000);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [isSpectator, gameId, api]);

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  const fireShot = useCallback(async (row, col) => {
    if (!isMyTurn || phase !== GAME_PHASES.FIRING || firingRef.current) return;
    const cellState = opponentBoard?.[row]?.[col];
    if (cellState === CELL_STATES.HIT || cellState === CELL_STATES.MISS || cellState === CELL_STATES.SUNK) return;
    firingRef.current = true;
    setFiring(true);
    try {
      const result = await api.fire(gameId, row, col, playerToken);
      setLastResult(result);
      if (result.opponentBoard) setOpponentBoard(result.opponentBoard);
      if (result.sunkShips) setSunkShips(result.sunkShips);

      if (result.gameOver || result.phase === GAME_PHASES.GAME_OVER) {
        if (aiTimerRef.current) {
          clearTimeout(aiTimerRef.current);
          aiTimerRef.current = null;
        }
        setAiShotPending(null);
        setPhase(GAME_PHASES.GAME_OVER);
        if (result.winner) setWinner(result.winner);
        if (result.playerBoard) setPlayerBoard(result.playerBoard);
        if (result.playerShipTypeMap) setPlayerShipTypeMap(result.playerShipTypeMap);
        firingRef.current = false;
        setFiring(false);
        return;
      }

      if (isAiMode && result.aiShot) {
        setIsMyTurn(false);
        setAiShotPending(result.aiShot);
        aiTimerRef.current = setTimeout(() => {
          aiTimerRef.current = null;
          setAiShotPending(null);
          if (result.playerBoard) setPlayerBoard(result.playerBoard);
          if (result.playerShipTypeMap) setPlayerShipTypeMap(result.playerShipTypeMap);
          if (result.phase) setPhase(result.phase);
          if (result.isMyTurn !== undefined) setIsMyTurn(result.isMyTurn);
          if (result.winner) setWinner(result.winner);
          firingRef.current = false;
          setFiring(false);
        }, 500);
      } else {
        if (result.phase) setPhase(result.phase);
        if (result.isMyTurn !== undefined) setIsMyTurn(result.isMyTurn);
        if (result.playerBoard) setPlayerBoard(result.playerBoard);
        if (result.playerShipTypeMap) setPlayerShipTypeMap(result.playerShipTypeMap);
        firingRef.current = false;
        setFiring(false);
      }
    } catch (err) {
      setError(err.message);
      firingRef.current = false;
      setFiring(false);
    }
  }, [gameId, playerToken, isMyTurn, phase, api, isAiMode, opponentBoard]);

  const submitPlacements = useCallback(async (placements) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      const result = await api.placeShips(gameId, placements, playerToken);
      if (result.phase) setPhase(result.phase);
      if (result.playerBoard) setPlayerBoard(result.playerBoard);
      if (result.playerShipTypeMap) setPlayerShipTypeMap(result.playerShipTypeMap);
      if (result.isMyTurn !== undefined) setIsMyTurn(result.isMyTurn);
    } catch (err) {
      setError(err.message);
    } finally {
      submittingRef.current = false;
    }
  }, [gameId, playerToken, api]);

  return {
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
    aiShotPending,
    firing,
    isSpectator,
    spectator,
    saveToken,
    fireShot,
    submitPlacements,
    setPhase,
    setPlayerBoard,
    setError,
  };
}
