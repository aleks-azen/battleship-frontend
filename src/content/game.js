export const SHIPS = [
  { type: 'CARRIER', name: 'Carrier', size: 5 },
  { type: 'BATTLESHIP', name: 'Battleship', size: 4 },
  { type: 'CRUISER', name: 'Cruiser', size: 3 },
  { type: 'SUBMARINE', name: 'Submarine', size: 3 },
  { type: 'DESTROYER', name: 'Destroyer', size: 2 },
];

export const BOARD_SIZE = 10;
export const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const COL_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export const CELL_STATES = {
  EMPTY: 'empty',
  SHIP: 'ship',
  HIT: 'hit',
  MISS: 'miss',
  SUNK: 'sunk',
  PREVIEW_VALID: 'preview-valid',
  PREVIEW_INVALID: 'preview-invalid',
};

export const GAME_PHASES = {
  WAITING: 'waiting-for-opponent',
  PLACING: 'placing-ships',
  FIRING: 'firing',
  GAME_OVER: 'game-over',
};

export const STATUS_MESSAGES = {
  [GAME_PHASES.WAITING]: 'Waiting for opponent to join...',
  [GAME_PHASES.PLACING]: 'Place your ships on the board',
  YOUR_TURN: 'Your turn - select a target on the enemy board',
  OPPONENT_TURN: "Opponent's turn - waiting...",
  WIN: 'Victory! You sank all enemy ships!',
  LOSE: 'Defeat. Your fleet has been destroyed.',
  HIT: 'Hit!',
  MISS: 'Miss.',
  SUNK: 'You sank their {ship}!',
  ENEMY_HIT: 'Enemy hit your ship!',
  ENEMY_MISS: 'Enemy missed.',
  ENEMY_SUNK: 'Enemy sank your {ship}!',
};

export const ORIENTATIONS = {
  HORIZONTAL: 'HORIZONTAL',
  VERTICAL: 'VERTICAL',
};

export const GAME_MODES = {
  AI: 'AI',
  MULTIPLAYER: 'MULTIPLAYER',
};

export const PLACEMENT_INSTRUCTIONS = [
  'Press R or click rotate to change orientation.',
  'Click board to place. Click placed ship to remove.',
  'Confirm when all ships are placed.',
];

export const WINNER = {
  ME: 'me',
  OPPONENT: 'opponent',
};

export const SPECTATOR_LABELS = {
  PLAYER_1: 'Player 1',
  PLAYER_2: 'Player 2',
  WINNER: 'Winner',
  LOSER: 'Loser',
  SPECTATING: 'Spectating',
  IN_PROGRESS: 'Game in progress',
};

export const CELL_SIZE = { xs: 28, sm: 34, md: 38 };
export const LABEL_SIZE = { xs: 20, sm: 24, md: 28 };
