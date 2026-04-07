import { useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getHeaders(playerToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (playerToken) {
    headers['X-Player-Token'] = playerToken;
  }
  return headers;
}

async function request(method, path, body, playerToken) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: getHeaders(playerToken),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export default function useApi() {
  const createGame = useCallback((mode) => {
    return request('POST', '/games', { mode });
  }, []);

  const joinGame = useCallback((gameId) => {
    return request('POST', `/games/${gameId}/join`);
  }, []);

  const placeShips = useCallback((gameId, placements, playerToken) => {
    return request('POST', `/games/${gameId}/place`, { placements }, playerToken);
  }, []);

  const fire = useCallback((gameId, row, col, playerToken) => {
    return request('POST', `/games/${gameId}/fire`, { row, col }, playerToken);
  }, []);

  const getGameState = useCallback((gameId, playerToken) => {
    return request('GET', `/games/${gameId}/state`, null, playerToken);
  }, []);

  const getHistory = useCallback(() => {
    return request('GET', '/games/history');
  }, []);

  return { createGame, joinGame, placeShips, fire, getGameState, getHistory };
}
