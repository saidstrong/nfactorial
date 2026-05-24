import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Crosshair,
  Crown,
  Download,
  Layers3,
  Radar,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";

const pillars = [
  {
    icon: BrainCircuit,
    title: "AI Director",
    body: "Mission briefings, crisis events, boss phase shifts, and final debriefs come from a server-side AI layer with safe local fallbacks.",
  },
  {
    icon: Layers3,
    title: "Enemy Waves",
    body: "Survive three escalating breach waves before the arena hands you over to the Blackout Core.",
  },
  {
    icon: Zap,
    title: "Upgrade Drafts",
    body: "After each clear, pick one combat module and shape the rest of the run around it.",
  },
  {
    icon: Crown,
    title: "Adaptive Boss",
    body: "The Blackout Core changes modes across the fight and forces movement, accuracy, and timing under pressure.",
  },
] as const;

const loopSteps = [
  {
    icon: Radar,
    title: "Deploy",
    body: "Launch directly in the browser. No install, no launcher, no setup beyond opening the raid page.",
  },
  {
    icon: Crosshair,
    title: "Survive",
    body: "Move with WASD, aim with the mouse, clear incoming bots, and protect enough health for the core chamber.",
  },
  {
    icon: Sparkles,
    title: "Upgrade",
    body: "Choose from focused power spikes like faster fire, reinforced armor, piercing shots, and tighter dash recovery.",
  },
  {
    icon: ShieldAlert,
    title: "Finish",
    body: "Read the AI Director, react to Wave 3 crisis conditions, then destroy the adaptive Blackout Core.",
  },
] as const;

const systemNotes = [
  "Top-down cyber raid shooter built for keyboard and mouse.",
  "Browser-based playable demo. No install required.",
  "Server-side OpenAI routes with validated outputs and fallbacks.",
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <nav className="panel flex items-center justify-between px-5 py-4">
          <Link className="font-display text-lg font-black tracking-[0.22em]" href="/">
            BLACKOUT RAID
          </Link>
          <div className="flex items-center gap-3">
            <Link
              className="status-chip hidden sm:inline-flex"
              href="/leaderboard"
            >
              Local Build
            </Link>
            <Link
              className="inline-flex items-center gap-2 border border-cyan-300/40 bg-cyan-300 px-4 py-2 text-sm font-bold uppercase tracking-[0.14em] text-[#031014] transition hover:bg-cyan-200"
              href="/play"
            >
              Start Raid
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_0.92fr]">
          <div className="panel-strong cyber-frame overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="status-chip border-orange-300/25 bg-orange-400/10 text-orange-100">
                Browser raid demo
              </span>
              <span className="status-chip text-cyan-100/82">
                No install required
              </span>
            </div>

            <h1 className="font-display mt-6 max-w-4xl text-5xl font-black uppercase tracking-[0.1em] text-white sm:text-6xl xl:text-7xl">
              BLACKOUT RAID
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-semibold text-cyan-100 sm:text-2xl">
              Survive the AI-directed dungeon.
            </p>
            <p className="mt-5 max-w-3xl text-base leading-8 text-cyan-100/72 sm:text-lg">
              BLACKOUT RAID is a browser-based cyber arena shooter where players
              survive enemy waves, choose focused upgrades, and fight an adaptive
              final boss under AI direction. The current build is a fast,
              playable vertical slice built for examiners to understand in
              seconds.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center gap-2 border border-cyan-300 bg-cyan-300 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#031014] transition hover:bg-cyan-200"
                href="/play"
              >
                Start Raid
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                className="inline-flex items-center justify-center gap-2 border border-cyan-300/35 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10"
                href="#how-it-works"
              >
                See How It Works
              </a>
            </div>

            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {systemNotes.map((note) => (
                <div className="metric-tile px-4 py-4" key={note}>
                  <p className="text-sm leading-6 text-cyan-100/72">{note}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="panel-strong scanline overflow-hidden px-5 py-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/60">
                  Live Arena Snapshot
                </p>
                <h2 className="font-display mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">
                  Mission Preview
                </h2>
              </div>
              <div className="status-chip border-orange-300/25 bg-orange-400/10 text-orange-100">
                AI Uplink
              </div>
            </div>

            <div className="relative min-h-[440px] overflow-hidden border border-cyan-300/18 bg-[#03080d]">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(88,243,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(88,243,255,0.06)_1px,transparent_1px)] bg-[size:42px_42px]" />
              <div className="absolute inset-6 border border-cyan-300/10" />
              <div className="absolute inset-x-6 top-6 flex items-center justify-between">
                <div className="status-chip text-cyan-100/82">Wave 3 breach</div>
                <div className="status-chip border-orange-300/25 bg-orange-400/10 text-orange-100">
                  Core detected
                </div>
              </div>

              <div className="absolute left-[49%] top-[52%]">
                <div className="absolute -left-7 -top-3 h-6 w-14 rounded-full bg-black/30 blur-sm" />
                <div className="absolute -left-5 -top-5 h-10 w-10 rounded-full border-2 border-cyan-100 bg-cyan-300 shadow-[0_0_28px_rgba(88,243,255,0.78)]" />
                <div className="absolute left-2 top-0 h-[2px] w-24 origin-left rotate-[-20deg] bg-cyan-100 shadow-[0_0_18px_rgba(88,243,255,0.9)]" />
              </div>

              <div className="absolute left-[58%] top-[28%]">
                <div className="absolute -left-9 -top-3 h-6 w-20 rounded-full bg-black/35 blur-sm" />
                <div className="absolute -left-7 -top-7 h-14 w-14 rounded-full border-[3px] border-orange-200 bg-[#43110a] shadow-[0_0_42px_rgba(255,125,56,0.5)]" />
                <div className="absolute -left-12 -top-12 h-24 w-24 rounded-full border border-orange-300/20" />
                <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full border border-orange-300/12" />
              </div>

              {[
                { left: "16%", top: "18%" },
                { left: "74%", top: "18%" },
                { left: "20%", top: "68%" },
                { left: "79%", top: "63%" },
                { left: "34%", top: "26%" },
                { left: "67%", top: "72%" },
              ].map((node, index) => (
                <div className="absolute" key={`${node.left}-${node.top}`}>
                  <div
                    className="absolute h-3 w-3 rounded-full bg-orange-300 shadow-[0_0_16px_rgba(255,125,56,0.92)]"
                    style={{ left: node.left, top: node.top }}
                  />
                  <div
                    className="absolute h-7 w-7 rounded-full border border-orange-300/18"
                    style={{
                      left: `calc(${node.left} - 8px)`,
                      top: `calc(${node.top} - 8px)`,
                      transform: `scale(${1 + index * 0.04})`,
                    }}
                  />
                </div>
              ))}

              <div className="absolute inset-x-5 bottom-5 grid gap-3">
                <div className="panel grid grid-cols-3 gap-3 px-4 py-3">
                  <SnapshotMetric label="HP" value="104 / 110" />
                  <SnapshotMetric label="Wave" value="3 / 3" />
                  <SnapshotMetric label="Dash" value="0.8s" />
                </div>
                <div className="panel-warm px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Bot className="h-4 w-4 text-orange-200" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-100/70">
                      AI Director
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-orange-100/78">
                    Power Surge detected. Enemy movement accelerated across the
                    chamber. Proceed before the Blackout Core stabilizes.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <article className="panel px-5 py-5" key={pillar.title}>
                <div className="flex h-12 w-12 items-center justify-center border border-cyan-300/18 bg-cyan-300/8">
                  <Icon className="h-5 w-5 text-cyan-200" />
                </div>
                <h2 className="font-display mt-5 text-xl font-black uppercase tracking-[0.08em] text-white">
                  {pillar.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-cyan-100/68">
                  {pillar.body}
                </p>
              </article>
            );
          })}
        </section>

        <section className="panel-strong px-6 py-7 sm:px-8" id="how-it-works">
          <div className="flex flex-col gap-4 border-b border-cyan-300/12 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/60">
                How It Works
              </p>
              <h2 className="font-display mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white sm:text-4xl">
                Four Steps To The Core
              </h2>
            </div>
            <div className="status-chip text-cyan-100/82">
              Browser-based demo build
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {loopSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article className="metric-tile px-5 py-5" key={step.title}>
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center border border-cyan-300/16 bg-cyan-300/8">
                      <Icon className="h-5 w-5 text-cyan-200" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/42">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="font-display mt-5 text-xl font-black uppercase tracking-[0.08em] text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-cyan-100/66">
                    {step.body}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel flex flex-col items-start justify-between gap-5 px-6 py-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/60">
              Ready To Demo
            </p>
            <h2 className="font-display mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white sm:text-3xl">
              Launch The Raid In Your Browser
            </h2>
            <p className="mt-3 text-sm leading-7 text-cyan-100/68 sm:text-base">
              The current build is a local, browser-based playable slice. Open
              the arena, learn the controls, clear the waves, and fight the
              AI-directed Blackout Core without installing anything.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="status-chip text-cyan-100/82">
              <Download className="h-4 w-4" />
              No install
            </div>
            <Link
              className="inline-flex items-center gap-2 border border-cyan-300 bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#031014] transition hover:bg-cyan-200"
              href="/play"
            >
              Start Raid
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-cyan-300/12 bg-[#091520]/80 px-3 py-2">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}
