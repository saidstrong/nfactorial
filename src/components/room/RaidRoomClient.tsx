"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowLeft, Crown, LoaderCircle, Play, RadioTower, Users } from "lucide-react";
import { RaidShell } from "@/components/game/RaidShell";
import {
  clearRoomSession,
  getStoredRoomSession,
} from "@/lib/coop/storage";
import type {
  CoopPlayerSession,
  CoopPlayerShot,
  CoopPlayerState,
  HostRaidSnapshot,
  RealtimeEnvelope,
  RoomPlayerRecord,
  RoomRecord,
} from "@/lib/coop/types";
import { formatSupabaseError, sanitizeRoomCode } from "@/lib/coop/utils";
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserEnv,
} from "@/lib/supabase/client";

type RaidRoomClientProps = {
  code: string;
};

export function RaidRoomClient({ code }: RaidRoomClientProps) {
  const normalizedCode = sanitizeRoomCode(code);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const supabaseReady = hasSupabaseBrowserEnv() && supabase;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const endedRoomRef = useRef(false);
  const teammateHeartbeatRef = useRef<number | null>(null);
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [players, setPlayers] = useState<RoomPlayerRecord[]>([]);
  const [session] = useState<CoopPlayerSession | null>(() =>
    typeof window === "undefined" ? null : getStoredRoomSession(normalizedCode),
  );
  const [error, setError] = useState<string | null>(() =>
    typeof window === "undefined" || getStoredRoomSession(normalizedCode)
      ? null
      : "No local room session was found. Create or join the room again.",
  );
  const [isLoading, setIsLoading] = useState(() =>
    typeof window === "undefined" ? true : Boolean(getStoredRoomSession(normalizedCode)),
  );
  const [isStarting, setIsStarting] = useState(false);
  const [incomingPlayerState, setIncomingPlayerState] =
    useState<CoopPlayerState | null>(null);
  const [incomingPlayerShot, setIncomingPlayerShot] =
    useState<CoopPlayerShot | null>(null);
  const [incomingHostSnapshot, setIncomingHostSnapshot] =
    useState<HostRaidSnapshot | null>(null);
  const [teammateLinked, setTeammateLinked] = useState(false);

  const teammate = players.find((player) => player.id !== session?.playerId) ?? null;

  const refreshLobby = useCallback(async () => {
    if (!supabaseReady || !supabase) {
      return;
    }

    try {
      const roomQuery = await supabase
        .from("rooms")
        .select("*")
        .eq("code", normalizedCode)
        .single();

      if (roomQuery.error || !roomQuery.data) {
        throw roomQuery.error ?? new Error("Room not found.");
      }

      const roomRecord = roomQuery.data as RoomRecord;

      const playerQuery = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", roomRecord.id)
        .order("joined_at", { ascending: true });

      if (playerQuery.error) {
        throw playerQuery.error;
      }

      setRoom(roomRecord);
      setPlayers((playerQuery.data ?? []) as RoomPlayerRecord[]);
      setError(null);
    } catch (refreshError) {
      setError(formatSupabaseError(refreshError, "Failed to load the room."));
    } finally {
      setIsLoading(false);
    }
  }, [normalizedCode, supabase, supabaseReady]);

  const broadcast = useCallback(
    async <TPayload,>(event: string, payload: TPayload) => {
      const channel = channelRef.current;

      if (!channel) {
        return;
      }

      const envelope: RealtimeEnvelope<TPayload> = {
        payload,
        sentAt: Date.now(),
        type: event,
      };

      await channel.send({
        type: "broadcast",
        event,
        payload: envelope,
      });
    },
    [],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    queueMicrotask(() => {
      void refreshLobby();
    });
  }, [refreshLobby, session]);

  useEffect(() => {
    if (!supabaseReady || !supabase || !session) {
      return;
    }

    const channel = supabase.channel(`raid-room-${normalizedCode}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "lobby-refresh" }, () => {
        void refreshLobby();
      })
      .on("broadcast", { event: "raid-start" }, async () => {
        await refreshLobby();
      })
      .on("broadcast", { event: "player-state" }, ({ payload }) => {
        const envelope = payload as RealtimeEnvelope<CoopPlayerState>;

        if (envelope.payload.playerId === session.playerId) {
          return;
        }

        setIncomingPlayerState(envelope.payload);
        teammateHeartbeatRef.current = Date.now();
        setTeammateLinked(true);
      })
      .on("broadcast", { event: "player-shot" }, ({ payload }) => {
        const envelope = payload as RealtimeEnvelope<CoopPlayerShot>;

        if (envelope.payload.playerId === session.playerId) {
          return;
        }

        setIncomingPlayerShot(envelope.payload);
        teammateHeartbeatRef.current = Date.now();
        setTeammateLinked(true);
      })
      .on("broadcast", { event: "host-snapshot" }, ({ payload }) => {
        const envelope = payload as RealtimeEnvelope<HostRaidSnapshot>;

        setIncomingHostSnapshot(envelope.payload);
        teammateHeartbeatRef.current = Date.now();
        setTeammateLinked(true);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void refreshLobby();
          void broadcast("lobby-refresh", { code: normalizedCode });
        }
      });

    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearInterval(refreshTimerRef.current);
      }

      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [broadcast, normalizedCode, refreshLobby, session, supabase, supabaseReady]);

  useEffect(() => {
    if (!room || room.status !== "waiting") {
      return;
    }

    refreshTimerRef.current = window.setInterval(() => {
      void refreshLobby();
    }, 4000);

    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [refreshLobby, room]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (teammateHeartbeatRef.current === null) {
        return;
      }

      setTeammateLinked(Date.now() - teammateHeartbeatRef.current < 2500);
    }, 800);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleStartRaid = useCallback(async () => {
    if (!supabaseReady || !supabase || !room || !session?.isHost) {
      return;
    }

    setIsStarting(true);

    try {
      const update = await supabase
        .from("rooms")
        .update({
          started_at: new Date().toISOString(),
          status: "active",
        })
        .eq("id", room.id);

      if (update.error) {
        throw update.error;
      }

      await refreshLobby();
      await broadcast("raid-start", {
        code: normalizedCode,
        hostPlayerId: session.playerId,
      });
    } catch (startError) {
      setError(formatSupabaseError(startError, "Failed to start the raid."));
    } finally {
      setIsStarting(false);
    }
  }, [broadcast, normalizedCode, refreshLobby, room, session, supabase, supabaseReady]);

  const handleLocalPlayerState = useCallback(
    async (state: CoopPlayerState) => {
      await broadcast("player-state", state);
    },
    [broadcast],
  );

  const handleLocalPlayerShot = useCallback(
    async (shot: CoopPlayerShot) => {
      await broadcast("player-shot", shot);
    },
    [broadcast],
  );

  const handleHostSnapshot = useCallback(
    async (snapshot: HostRaidSnapshot) => {
      await broadcast("host-snapshot", snapshot);

      if (
        session?.isHost &&
        !endedRoomRef.current &&
        (snapshot.status === "victory" || snapshot.status === "operator-down") &&
        room
      ) {
        endedRoomRef.current = true;
        await supabase
          ?.from("rooms")
          .update({
            finished_at: new Date().toISOString(),
            status: "finished",
          })
          .eq("id", room.id);
        await refreshLobby();
      }
    },
    [broadcast, refreshLobby, room, session, supabase],
  );

  if (!supabaseReady) {
    return (
      <main className="min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <section className="panel-warm px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100/60">
              Co-op unavailable
            </p>
            <h1 className="font-display mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white">
              Missing Supabase Environment
            </h1>
            <p className="mt-4 text-sm leading-7 text-orange-100/78">
              Co-op requires `NEXT_PUBLIC_SUPABASE_URL` and
              `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Solo play remains available.
            </p>
            <div className="mt-5 flex gap-3">
              <Link
                className="inline-flex items-center gap-2 border border-cyan-300 bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#031014] transition hover:bg-cyan-200"
                href="/play"
              >
                Start Solo Raid
              </Link>
              <Link
                className="inline-flex items-center gap-2 border border-cyan-300/35 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10"
                href="/room"
              >
                Back to rooms
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (isLoading || !session || !room) {
    return (
      <main className="min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <section className="panel-strong flex items-center gap-4 px-5 py-5">
            <LoaderCircle className="h-5 w-5 animate-spin text-cyan-200" />
            <p className="text-sm leading-7 text-cyan-100/74">
              Synchronizing room state and operator session.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (room.status === "active" || room.status === "finished") {
    return (
      <RaidShell
        multiplayer={{
          incomingHostSnapshot,
          incomingPlayerShot,
          incomingPlayerState,
          isHost: session.isHost,
          localNickname: session.nickname,
          localPlayerId: session.playerId,
          onHostSnapshot: session.isHost ? handleHostSnapshot : undefined,
          onLocalPlayerShot: handleLocalPlayerShot,
          onLocalPlayerState: handleLocalPlayerState,
          roomCode: room.code,
          teammateLinked,
          teammateNickname: teammate?.nickname ?? null,
        }}
      />
    );
  }

  return (
    <main className="min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="panel flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/62 transition hover:text-cyan-100"
              href="/room"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to room entry
            </Link>
            <h1 className="font-display mt-4 text-4xl font-black uppercase tracking-[0.1em] text-white sm:text-5xl">
              Room {room.code}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-cyan-100/70 sm:text-base">
              Linked operators wait here until the host starts the co-op raid.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <LobbyMetric label="Code" value={room.code} />
            <LobbyMetric label="Role" value={session.isHost ? "Host" : "Guest"} />
            <LobbyMetric label="Players" value={`${players.length}/2`} />
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="panel-strong px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/60">
                  Lobby Roster
                </p>
                <h2 className="font-display mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
                  Linked Operators
                </h2>
              </div>
              <div className="status-chip text-cyan-100/78">
                {players.length < 2 ? "Waiting" : "Ready"}
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {players.map((player) => (
                <div className="metric-tile flex items-center justify-between gap-4 px-4 py-4" key={player.id}>
                  <div>
                    <p className="font-display text-lg font-black uppercase tracking-[0.08em] text-white">
                      {player.nickname}
                    </p>
                    <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/56">
                      {player.id === session.playerId ? "You" : "Linked operator"}
                    </p>
                  </div>
                  {player.is_host ? (
                    <div className="status-chip border-orange-300/22 bg-orange-400/10 text-orange-100">
                      <Crown className="h-4 w-4" />
                      Host
                    </div>
                  ) : (
                    <div className="status-chip text-cyan-100/74">
                      <Users className="h-4 w-4" />
                      Guest
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error ? (
              <div className="panel-warm mt-5 px-4 py-4">
                <p className="text-sm leading-7 text-orange-100/80">{error}</p>
              </div>
            ) : null}
          </section>

          <aside className="flex flex-col gap-4">
            <section className="panel px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/60">
                Raid Control
              </p>
              <h2 className="font-display mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
                Launch Window
              </h2>
              <p className="mt-4 text-sm leading-7 text-cyan-100/68">
                {session.isHost
                  ? players.length >= 2
                    ? "Both operators are linked. Start the raid when ready."
                    : "Wait for a second operator to join before launching the raid."
                  : "Waiting for the host to start the raid."}
              </p>

              {session.isHost ? (
                <button
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-cyan-300 bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#031014] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={players.length < 2 || isStarting}
                  onClick={handleStartRaid}
                  type="button"
                >
                  <Play className="h-4 w-4" />
                  {isStarting ? "Starting Raid..." : "Start Raid"}
                </button>
              ) : (
                <div className="panel-strong mt-5 flex items-center gap-3 px-4 py-4">
                  <RadioTower className="h-4 w-4 text-orange-200" />
                  <p className="text-sm leading-7 text-cyan-100/72">
                    Host control is required to open the chamber route.
                  </p>
                </div>
              )}
            </section>

            <section className="panel px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/60">
                Hackathon Notes
              </p>
              <div className="mt-4 grid gap-3">
                <LobbyMetric label="Transport" value="Supabase Realtime" />
                <LobbyMetric label="Authority" value="Host browser" />
                <LobbyMetric label="Fallback" value="Solo /play" />
              </div>
            </section>

            <button
              className="inline-flex items-center justify-center gap-2 border border-cyan-300/35 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10"
              onClick={() => {
                clearRoomSession(normalizedCode);
                window.location.href = "/room";
              }}
              type="button"
            >
              Leave Room
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}

function LobbyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-tile px-4 py-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/54">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}
