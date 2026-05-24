import type {
  Coordinate,
  GameBoard,
  GameCell,
  GameConfig,
  GameState,
  RevealResult,
  ScanRisk,
} from "./types";

export const DEFAULT_GAME_CONFIG: GameConfig = {
  rows: 10,
  columns: 10,
  corruptedNodes: 15,
};

const NEIGHBOR_OFFSETS: ReadonlyArray<[number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export function createGame(seed = 1, config = DEFAULT_GAME_CONFIG): GameState {
  validateConfig(config);

  const corruptionSet = createCorruptionSet(config, seed);
  const board = createBoard(config, corruptionSet);
  const safeCellCount = config.rows * config.columns - config.corruptedNodes;

  return {
    board,
    config,
    status: "active",
    flagsRemaining: config.corruptedNodes,
    safeRevealed: 0,
    safeCellCount,
    seed,
    detonatedCell: null,
  };
}

export function revealCell(
  state: GameState,
  coordinate: Coordinate,
  options: { shieldActive?: boolean } = {},
): RevealResult {
  if (state.status !== "active" || !isInsideBoard(state.board, coordinate)) {
    return createRevealResult(state, "ignored", null);
  }

  const target = state.board[coordinate.row][coordinate.column];

  if (target.visibility !== "hidden") {
    return createRevealResult(state, "ignored", null);
  }

  const board = cloneBoard(state.board);
  const nextTarget = board[coordinate.row][coordinate.column];

  if (nextTarget.isCorrupted) {
    if (options.shieldActive) {
      nextTarget.visibility = "contained";

      return createRevealResult(
        {
          ...state,
          board,
          detonatedCell: coordinate,
        },
        "shield-absorbed",
        coordinate,
      );
    }

    nextTarget.visibility = "revealed";

    return createRevealResult(
      {
        ...state,
        board,
        status: "blackout",
        detonatedCell: coordinate,
      },
      "blackout",
      coordinate,
    );
  }

  floodReveal(board, coordinate);

  const safeRevealed = countSafeRevealed(board);
  const status = safeRevealed === state.safeCellCount ? "grid-restored" : "active";

  return createRevealResult(
    {
      ...state,
      board,
      safeRevealed,
      status,
    },
    status === "grid-restored" ? "grid-restored" : "safe-revealed",
    coordinate,
  );
}

export function toggleFlag(
  state: GameState,
  coordinate: Coordinate,
): GameState {
  if (state.status !== "active" || !isInsideBoard(state.board, coordinate)) {
    return state;
  }

  const target = state.board[coordinate.row][coordinate.column];

  if (target.visibility !== "hidden" && target.visibility !== "flagged") {
    return state;
  }

  if (target.visibility === "hidden" && state.flagsRemaining === 0) {
    return state;
  }

  const board = cloneBoard(state.board);
  const nextTarget = board[coordinate.row][coordinate.column];
  const isFlagging = nextTarget.visibility === "hidden";

  nextTarget.visibility = isFlagging ? "flagged" : "hidden";

  return {
    ...state,
    board,
    flagsRemaining: state.flagsRemaining + (isFlagging ? -1 : 1),
  };
}

export function forceBlackout(state: GameState): GameState {
  if (state.status !== "active") {
    return state;
  }

  return {
    ...state,
    status: "blackout",
  };
}

export function getScanRisk(state: GameState, coordinate: Coordinate): ScanRisk | null {
  if (state.status !== "active" || !isInsideBoard(state.board, coordinate)) {
    return null;
  }

  const cell = state.board[coordinate.row][coordinate.column];

  if (cell.visibility !== "hidden") {
    return null;
  }

  if (cell.isCorrupted) {
    return "CRITICAL";
  }

  if (cell.adjacentCorruptions >= 3) {
    return "HIGH";
  }

  if (cell.adjacentCorruptions >= 1) {
    return "MEDIUM";
  }

  return "LOW";
}

function validateConfig(config: GameConfig): void {
  const totalCells = config.rows * config.columns;

  if (config.rows <= 0 || config.columns <= 0) {
    throw new Error("Game board dimensions must be positive.");
  }

  if (config.corruptedNodes <= 0 || config.corruptedNodes >= totalCells) {
    throw new Error("Corrupted node count must leave at least one safe cell.");
  }
}

function createBoard(
  config: GameConfig,
  corruptionSet: ReadonlySet<string>,
): GameBoard {
  return Array.from({ length: config.rows }, (_, row) =>
    Array.from({ length: config.columns }, (_, column) => {
      const id = toCellId(row, column);
      const cell: GameCell = {
        id,
        row,
        column,
        isCorrupted: corruptionSet.has(id),
        adjacentCorruptions: 0,
        visibility: "hidden",
      };

      cell.adjacentCorruptions = countAdjacentCorruptions(cell, config, corruptionSet);

      return cell;
    }),
  );
}

function createCorruptionSet(config: GameConfig, seed: number): Set<string> {
  const random = createSeededRandom(seed);
  const coordinates = Array.from(
    { length: config.rows * config.columns },
    (_, index) => ({
      row: Math.floor(index / config.columns),
      column: index % config.columns,
    }),
  );

  for (let index = coordinates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [coordinates[index], coordinates[swapIndex]] = [
      coordinates[swapIndex],
      coordinates[index],
    ];
  }

  return new Set(
    coordinates
      .slice(0, config.corruptedNodes)
      .map((coordinate) => toCellId(coordinate.row, coordinate.column)),
  );
}

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);

    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function floodReveal(board: GameBoard, start: Coordinate): void {
  const queue: Coordinate[] = [start];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const coordinate = queue.shift();

    if (!coordinate || visited.has(toCellId(coordinate.row, coordinate.column))) {
      continue;
    }

    visited.add(toCellId(coordinate.row, coordinate.column));

    if (!isInsideBoard(board, coordinate)) {
      continue;
    }

    const cell = board[coordinate.row][coordinate.column];

    if (cell.visibility !== "hidden" || cell.isCorrupted) {
      continue;
    }

    cell.visibility = "revealed";

    if (cell.adjacentCorruptions === 0) {
      getNeighbors(board, coordinate).forEach((neighbor) => {
        if (neighbor.visibility === "hidden" && !neighbor.isCorrupted) {
          queue.push(neighbor);
        }
      });
    }
  }
}

function countAdjacentCorruptions(
  coordinate: Coordinate,
  config: GameConfig,
  corruptionSet: ReadonlySet<string>,
): number {
  return NEIGHBOR_OFFSETS.reduce((count, [rowOffset, columnOffset]) => {
    const row = coordinate.row + rowOffset;
    const column = coordinate.column + columnOffset;

    if (
      row >= 0 &&
      row < config.rows &&
      column >= 0 &&
      column < config.columns &&
      corruptionSet.has(toCellId(row, column))
    ) {
      return count + 1;
    }

    return count;
  }, 0);
}

function getNeighbors(board: GameBoard, coordinate: Coordinate): GameCell[] {
  return NEIGHBOR_OFFSETS.flatMap(([rowOffset, columnOffset]) => {
    const row = coordinate.row + rowOffset;
    const column = coordinate.column + columnOffset;

    if (!isInsideBoard(board, { row, column })) {
      return [];
    }

    return board[row][column];
  });
}

function countSafeRevealed(board: GameBoard): number {
  return board.flat().filter((cell) => !cell.isCorrupted && cell.visibility === "revealed")
    .length;
}

function createRevealResult(
  state: GameState,
  outcome: RevealResult["outcome"],
  coordinate: Coordinate | null,
): RevealResult {
  return {
    state,
    outcome,
    coordinate,
  };
}

function cloneBoard(board: GameBoard): GameBoard {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function isInsideBoard(board: GameBoard, coordinate: Coordinate): boolean {
  return (
    coordinate.row >= 0 &&
    coordinate.row < board.length &&
    coordinate.column >= 0 &&
    coordinate.column < (board[coordinate.row]?.length ?? 0)
  );
}

function toCellId(row: number, column: number): string {
  return `${row}:${column}`;
}
