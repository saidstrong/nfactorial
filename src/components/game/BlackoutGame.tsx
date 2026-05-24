"use client";

import { useState } from "react";
import { createGame, revealCell, toggleFlag } from "@/lib/game/engine";
import type { Coordinate, GameState } from "@/lib/game/types";
import { GameBoard } from "./GameBoard";
import { MissionControl } from "./MissionControl";

const INITIAL_SEED = 20260524;

export function BlackoutGame() {
  const [game, setGame] = useState<GameState>(() => createGame(INITIAL_SEED));
  const [flagMode, setFlagMode] = useState(false);

  function handleReveal(coordinate: Coordinate) {
    setGame((currentGame) => revealCell(currentGame, coordinate));
  }

  function handleToggleFlag(coordinate: Coordinate) {
    setGame((currentGame) => toggleFlag(currentGame, coordinate));
  }

  function handleRestart() {
    setGame((currentGame) => createGame(currentGame.seed + 1));
    setFlagMode(false);
  }

  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col justify-between gap-4 border-b border-cyan-300/20 pb-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-[0.08em] text-white sm:text-5xl">
              BLACKOUT GRID
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-cyan-100/70">
            Restore safe power nodes and quarantine hidden corruptions before
            the city grid collapses.
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <GameBoard
            board={game.board}
            detonatedCell={game.detonatedCell}
            flagMode={flagMode}
            onReveal={handleReveal}
            onToggleFlag={handleToggleFlag}
            status={game.status}
          />
          <MissionControl
            flagMode={flagMode}
            game={game}
            onRestart={handleRestart}
            onToggleFlagMode={() => setFlagMode((enabled) => !enabled)}
          />
        </div>
      </div>
    </main>
  );
}
