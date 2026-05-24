"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Link2, RadioTower, Shield, Users } from "lucide-react";
import type { CoopPlayerSession, RoomRecord } from "@/lib/coop/types";
import { storeRoomSession } from "@/lib/coop/storage";
import {
  formatSupabaseError,
  generateRoomCode,
  sanitizeNickname,
  sanitizeRoomCode,
} from "@/lib/coop/utils";
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserEnv,
} from "@/lib/supabase/client";

export function RoomEntry() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const supabaseReady = hasSupabaseBrowserEnv() && supabase;

  async function createRoom() {
    const nextNickname = sanitizeNickname(nickname);

    if (!nextNickname) {
      setError("Enter a nickname before creating a co-op room.");
      return;
    }

    if (!supabaseReady || !supabase) {
      setError(
        "Co-op requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const playerId = crypto.randomUUID();
      let room: RoomRecord | null = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateRoomCode();
        const roomInsert = await supabase
          .from("rooms")
          .insert({
            code,
            status: "waiting",
          })
          .select("*")
          .single();

        if (!roomInsert.error && roomInsert.data) {
          room = roomInsert.data as RoomRecord;
          break;
        }

        if (!roomInsert.error?.message.toLowerCase().includes("duplicate")) {
          throw roomInsert.error;
        }
      }

      if (!room) {
        throw new Error("Could not allocate a room code. Try again.");
      }

      const playerInsert = await supabase.from("room_players").insert({
        id: playerId,
        is_host: true,
        nickname: nextNickname,
        room_id: room.id,
      });

      if (playerInsert.error) {
        throw playerInsert.error;
      }

      const roomUpdate = await supabase
        .from("rooms")
        .update({ host_player_id: playerId })
        .eq("id", room.id);

      if (roomUpdate.error) {
        throw roomUpdate.error;
      }

      const session: CoopPlayerSession = {
        isHost: true,
        nickname: nextNickname,
        playerId,
        roomCode: room.code,
        roomId: room.id,
      };

      storeRoomSession(session);
      router.push(`/room/${room.code}`);
    } catch (createError) {
      setError(formatSupabaseError(createError, "Failed to create a co-op room."));
    } finally {
      setIsCreating(false);
    }
  }

  async function joinRoom() {
    const nextNickname = sanitizeNickname(nickname);
    const nextCode = sanitizeRoomCode(roomCode);

    if (!nextNickname) {
      setError("Enter a nickname before joining a room.");
      return;
    }

    if (nextCode.length !== 6) {
      setError("Enter a valid 6-character room code.");
      return;
    }

    if (!supabaseReady || !supabase) {
      setError(
        "Co-op requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const roomQuery = await supabase
        .from("rooms")
        .select("*")
        .eq("code", nextCode)
        .single();

      if (roomQuery.error || !roomQuery.data) {
        throw new Error("Room code not found.");
      }

      const roomRecord = roomQuery.data as RoomRecord;

      if (roomRecord.status !== "waiting") {
        throw new Error("That room has already started. Create a new one.");
      }

      const playersQuery = await supabase
        .from("room_players")
        .select("id")
        .eq("room_id", roomRecord.id);

      if (playersQuery.error) {
        throw playersQuery.error;
      }

      if ((playersQuery.data?.length ?? 0) >= 2) {
        throw new Error("That room is full.");
      }

      const playerId = crypto.randomUUID();
      const playerInsert = await supabase.from("room_players").insert({
        id: playerId,
        is_host: false,
        nickname: nextNickname,
        room_id: roomRecord.id,
      });

      if (playerInsert.error) {
        throw playerInsert.error;
      }

      const session: CoopPlayerSession = {
        isHost: false,
        nickname: nextNickname,
        playerId,
        roomCode: roomRecord.code,
        roomId: roomRecord.id,
      };

      storeRoomSession(session);
      router.push(`/room/${roomRecord.code}`);
    } catch (joinError) {
      setError(formatSupabaseError(joinError, "Failed to join that room."));
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="panel flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Link
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/62 transition hover:text-cyan-100"
              href="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to briefing
            </Link>
            <h1 className="font-display mt-4 text-4xl font-black uppercase tracking-[0.1em] text-white sm:text-5xl">
              Co-op Uplink
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-cyan-100/70 sm:text-base">
              Create a room, share the code, and launch the raid with one linked
              operator. This MVP uses Supabase Realtime for lobby sync and live
              combat telemetry.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile icon={Users} label="Capacity" value="2 operators" />
            <InfoTile icon={RadioTower} label="Sync" value="Realtime" />
            <InfoTile icon={Shield} label="Fallback" value="Solo /play" />
          </div>
        </header>

        {!supabaseReady ? (
          <section className="panel-warm px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100/60">
              Co-op unavailable
            </p>
            <h2 className="font-display mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
              Missing Supabase Environment
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-100/78">
              Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
              to enable room creation, lobby sync, and Realtime player updates.
              Solo raid remains fully playable.
            </p>
            <div className="mt-5">
              <Link
                className="inline-flex items-center gap-2 border border-cyan-300 bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#031014] transition hover:bg-cyan-200"
                href="/play"
              >
                Start Solo Raid
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_1fr]">
          <section className="panel-strong px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/60">
              Operator Identity
            </p>
            <h2 className="font-display mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
              Enter Your Nickname
            </h2>
            <label className="mt-5 block">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/56">
                Callsign
              </span>
              <input
                className="mt-2 w-full border border-cyan-300/18 bg-[#07131c] px-4 py-3 text-base text-white outline-none transition placeholder:text-cyan-100/28 focus:border-cyan-200"
                maxLength={24}
                onChange={(event) => {
                  setNickname(event.target.value);
                  setError(null);
                }}
                placeholder="Operator"
                value={nickname}
              />
            </label>
            <p className="mt-3 text-sm leading-6 text-cyan-100/62">
              Nickname is shared into the lobby and shown above your linked
              operator in the arena.
            </p>
          </section>

          <div className="grid gap-5">
            <section className="panel px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/60">
                    Create Room
                  </p>
                  <h2 className="font-display mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
                    Host A Co-op Raid
                  </h2>
                </div>
                <div className="status-chip text-cyan-100/78">Host</div>
              </div>
              <p className="mt-4 text-sm leading-7 text-cyan-100/66">
                Generate a room code, wait for a teammate in the lobby, then
                start the raid from the host browser.
              </p>
              <button
                className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-cyan-300 bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#031014] transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
                disabled={!supabaseReady || isCreating}
                onClick={createRoom}
                type="button"
              >
                {isCreating ? "Allocating Room..." : "Create Co-op Room"}
              </button>
            </section>

            <section className="panel px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/60">
                    Join Room
                  </p>
                  <h2 className="font-display mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
                    Link To A Host
                  </h2>
                </div>
                <div className="status-chip border-orange-300/22 bg-orange-400/10 text-orange-100">
                  Guest
                </div>
              </div>
              <label className="mt-5 block">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/56">
                  Room Code
                </span>
                <div className="relative mt-2">
                  <input
                    className="w-full border border-cyan-300/18 bg-[#07131c] px-4 py-3 pr-11 text-base uppercase tracking-[0.28em] text-white outline-none transition placeholder:text-cyan-100/28 focus:border-cyan-200"
                    maxLength={6}
                    onChange={(event) => {
                      setRoomCode(sanitizeRoomCode(event.target.value));
                      setError(null);
                    }}
                    placeholder="ABC123"
                    value={roomCode}
                  />
                  <Link2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/36" />
                </div>
              </label>
              <button
                className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-orange-300 bg-orange-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#160704] transition hover:bg-orange-200 disabled:cursor-wait disabled:opacity-60"
                disabled={!supabaseReady || isJoining}
                onClick={joinRoom}
                type="button"
              >
                {isJoining ? "Linking..." : "Join Room"}
              </button>
            </section>
          </div>
        </section>

        {error ? (
          <section className="panel-warm px-5 py-4">
            <p className="text-sm leading-7 text-orange-100/80">{error}</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-tile px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-200" />
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/54">
          {label}
        </p>
      </div>
      <p className="mt-3 text-lg font-black text-white">{value}</p>
    </div>
  );
}
