"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createGame,
  forceBlackout,
  getScanRisk,
  revealCell,
  toggleFlag,
} from "@/lib/game/engine";
import {
  calculateScore,
  getFlagSummary,
  getRankLabel,
} from "@/lib/game/scoring";
import type { Coordinate, GameState, ShieldStatus } from "@/lib/game/types";
import { GameBoard } from "./GameBoard";
import { MissionControl } from "./MissionControl";

const INITIAL_SEED = 20260524;
const INITIAL_STABILITY = 100;
const SCAN_COST = 5;
const SHIELD_ABSORB_COST = 25;
const STABILITY_DECAY_SECONDS = 30;
const STABILITY_DECAY_COST = 3;
const MAX_LOG_ENTRIES = 8;
const INITIAL_LOG = ["Mission started. Corruption hidden across the grid."];

export function BlackoutGame() {
  const [game, setGame] = useState<GameState>(() => createGame(INITIAL_SEED));
  const [flagMode, setFlagMode] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stability, setStability] = useState(INITIAL_STABILITY);
  const [aiToolsUsed, setAiToolsUsed] = useState(0);
  const [shieldStatus, setShieldStatus] = useState<ShieldStatus>("available");
  const [missionLog, setMissionLog] = useState<string[]>(INITIAL_LOG);

  const flagSummary = useMemo(() => getFlagSummary(game.board), [game.board]);
  const score = useMemo(
    () =>
      calculateScore({
        aiToolsUsed,
        correctFlags: flagSummary.correctFlags,
        elapsedSeconds,
        safeRevealed: game.safeRevealed,
        stability,
        wrongFlags: flagSummary.wrongFlags,
      }),
    [
      aiToolsUsed,
      elapsedSeconds,
      flagSummary.correctFlags,
      flagSummary.wrongFlags,
      game.safeRevealed,
      stability,
    ],
  );
  const rankLabel = getRankLabel(score);

  useEffect(() => {
    if (game.status !== "active") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) => {
        const nextSeconds = currentSeconds + 1;

        if (nextSeconds % STABILITY_DECAY_SECONDS === 0) {
          setStability((currentStability) => {
            const nextStability = clampStability(
              currentStability - STABILITY_DECAY_COST,
            );

            setMissionLog((currentLog) =>
              appendMissionLog(
                currentLog,
                nextStability === 0
                  ? "Stability depleted. Blackout triggered."
                  : "Grid strain increased. Stability reduced.",
              ),
            );

            if (nextStability === 0) {
              setGame((currentGame) => forceBlackout(currentGame));
              setFlagMode(false);
              setScanMode(false);
            }

            return nextStability;
          });
        }

        return nextSeconds;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [game.status]);

  function handleReveal(coordinate: Coordinate) {
    if (game.status !== "active") {
      return;
    }

    if (scanMode) {
      handleScan(coordinate);
      return;
    }

    const result = revealCell(game, coordinate, {
      shieldActive: shieldStatus === "armed",
    });

    if (result.outcome === "ignored") {
      return;
    }

    let nextGame = result.state;
    let nextStability = stability;
    const logEntries: string[] = [];

    if (result.outcome === "shield-absorbed") {
      nextStability = clampStability(stability - SHIELD_ABSORB_COST);
      setShieldStatus("consumed");
      logEntries.push("Shield absorbed a corrupted node. Stability damaged.");

      if (nextStability === 0) {
        nextGame = forceBlackout(nextGame);
        logEntries.push("Blackout triggered.");
      }
    }

    if (result.outcome === "grid-restored") {
      setFlagMode(false);
      setScanMode(false);
      logEntries.push("Grid restored.");
    }

    if (result.outcome === "blackout") {
      setFlagMode(false);
      setScanMode(false);
      logEntries.push("Blackout triggered.");
    }

    setGame(nextGame);
    setStability(nextStability);

    if (logEntries.length > 0) {
      setMissionLog((currentLog) => appendMissionLog(currentLog, ...logEntries));
    }
  }

  function handleToggleFlag(coordinate: Coordinate) {
    setGame((currentGame) => toggleFlag(currentGame, coordinate));
  }

  function handleScan(coordinate: Coordinate) {
    if (game.status !== "active") {
      return;
    }

    if (stability < SCAN_COST) {
      setScanMode(false);
      setMissionLog((currentLog) =>
        appendMissionLog(currentLog, "Scan aborted. Stability too low."),
      );
      return;
    }

    const risk = getScanRisk(game, coordinate);

    if (!risk) {
      setMissionLog((currentLog) =>
        appendMissionLog(currentLog, "Scan blocked. Select a hidden node."),
      );
      return;
    }

    const nextStability = clampStability(stability - SCAN_COST);
    const logEntries = [`Node scanned: ${risk} risk.`];
    let nextGame = game;

    if (nextStability === 0) {
      nextGame = forceBlackout(game);
      setFlagMode(false);
      logEntries.push("Blackout triggered.");
    }

    setGame(nextGame);
    setStability(nextStability);
    setAiToolsUsed((current) => current + 1);
    setScanMode(false);
    setMissionLog((currentLog) => appendMissionLog(currentLog, ...logEntries));
  }

  function handleToggleFlagMode() {
    if (game.status !== "active") {
      return;
    }

    setFlagMode((enabled) => {
      const nextEnabled = !enabled;

      if (nextEnabled) {
        setScanMode(false);
      }

      return nextEnabled;
    });
  }

  function handleToggleScanMode() {
    if (game.status !== "active") {
      return;
    }

    if (scanMode) {
      setScanMode(false);
      setMissionLog((currentLog) =>
        appendMissionLog(currentLog, "Scan Mode cancelled."),
      );
      return;
    }

    if (stability < SCAN_COST) {
      setMissionLog((currentLog) =>
        appendMissionLog(currentLog, "Scan unavailable. Stability too low."),
      );
      return;
    }

    setFlagMode(false);
    setScanMode(true);
    setMissionLog((currentLog) =>
      appendMissionLog(currentLog, "Scan Mode armed. Select a hidden node."),
    );
  }

  function handleActivateShield() {
    if (game.status !== "active" || shieldStatus !== "available") {
      return;
    }

    setFlagMode(false);
    setScanMode(false);
    setShieldStatus("armed");
    setMissionLog((currentLog) =>
      appendMissionLog(currentLog, "Shield Pulse armed."),
    );
  }

  function handleRestart() {
    setGame((currentGame) => createGame(currentGame.seed + 1));
    setFlagMode(false);
    setScanMode(false);
    setElapsedSeconds(0);
    setStability(INITIAL_STABILITY);
    setAiToolsUsed(0);
    setShieldStatus("available");
    setMissionLog(INITIAL_LOG);
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
            onScan={handleScan}
            onToggleFlag={handleToggleFlag}
            scanMode={scanMode}
            status={game.status}
          />
          <MissionControl
            aiToolsUsed={aiToolsUsed}
            correctFlags={flagSummary.correctFlags}
            elapsedSeconds={elapsedSeconds}
            flagMode={flagMode}
            game={game}
            missionLog={missionLog}
            onActivateShield={handleActivateShield}
            onRestart={handleRestart}
            onToggleFlagMode={handleToggleFlagMode}
            onToggleScanMode={handleToggleScanMode}
            rankLabel={rankLabel}
            scanMode={scanMode}
            score={score}
            shieldStatus={shieldStatus}
            stability={stability}
            wrongFlags={flagSummary.wrongFlags}
          />
        </div>
      </div>
    </main>
  );
}

function clampStability(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function appendMissionLog(currentLog: string[], ...entries: string[]): string[] {
  return [...entries.reverse(), ...currentLog].slice(0, MAX_LOG_ENTRIES);
}
