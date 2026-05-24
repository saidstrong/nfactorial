import Link from "next/link";

const rules = [
  "Move through a top-down cyber arena with WASD and dash out of danger.",
  "Aim with the mouse and fire pulse shots into incoming enemy waves.",
  "Earn score by clearing corrupted crawlers before they overwhelm you.",
  "Later phases add upgrades, adaptive events, and the Blackout Core boss.",
];

const featureCards = [
  {
    title: "Top-Down Cyber Raid",
    body: "Enter a dark digital arena built for fast movement, aim, and dodging.",
  },
  {
    title: "Enemy Waves",
    body: "Crawler bots push the operator from the edges and punish bad spacing.",
  },
  {
    title: "AI Director Later",
    body: "Upcoming passes add upgrades and an adaptive boss directed by AI.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col justify-between gap-10">
        <nav className="flex items-center justify-between border-b border-cyan-300/20 pb-5">
          <Link
            className="text-lg font-black tracking-[0.2em] text-white"
            href="/"
          >
            BLACKOUT RAID
          </Link>
          <Link
            className="border border-cyan-300/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10"
            href="/leaderboard"
          >
            Leaderboard
          </Link>
        </nav>

        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.85fr]">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-black tracking-[0.08em] text-white sm:text-6xl lg:text-7xl">
              BLACKOUT RAID
            </h1>
            <p className="mt-5 text-xl font-semibold text-cyan-100 sm:text-2xl">
              Survive the AI-directed dungeon.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-cyan-100/70">
              A top-down cyber raid where an Operator fights corrupted enemy
              waves inside a hostile digital arena. Upgrades and the adaptive AI
              boss arrive in later phases; the first mission is pure movement,
              aiming, and survival.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="border border-cyan-300 bg-cyan-300 px-6 py-3 text-center text-sm font-black uppercase tracking-[0.16em] text-[#021012] transition hover:bg-cyan-200"
                href="/play"
              >
                Start Raid
              </Link>
              <a
                className="border border-amber-300/60 px-6 py-3 text-center text-sm font-bold uppercase tracking-[0.16em] text-amber-100 transition hover:border-amber-200 hover:bg-amber-300/10"
                href="#how-it-works"
              >
                How It Works
              </a>
            </div>
          </div>

          <div className="scanline border border-cyan-300/20 bg-[#061016]/90 p-5 shadow-[0_0_42px_rgba(45,212,191,0.12)]">
            <div className="relative aspect-[4/3] overflow-hidden border border-cyan-300/20 bg-[#02060b]">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(42,252,219,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(42,252,219,0.08)_1px,transparent_1px)] bg-[size:42px_42px]" />
              <div className="absolute left-[46%] top-[45%] h-10 w-10 rounded-full border-2 border-cyan-100 bg-cyan-300 shadow-[0_0_28px_rgba(45,212,191,0.75)]" />
              <div className="absolute left-[54%] top-[47%] h-1 w-24 origin-left rotate-[-18deg] bg-cyan-200 shadow-[0_0_18px_rgba(115,247,255,0.9)]" />
              {[12, 24, 38, 62, 74].map((left, index) => (
                <div
                  className="absolute h-8 w-8 rounded-full border-2 border-orange-200 bg-orange-600 shadow-[0_0_22px_rgba(255,90,31,0.55)]"
                  key={left}
                  style={{
                    left: `${left}%`,
                    top: `${index % 2 === 0 ? 20 + index * 9 : 62 - index * 4}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className="grid gap-4 border-t border-cyan-300/20 pt-6 md:grid-cols-[0.9fr_1.1fr]"
          id="how-it-works"
        >
          <div>
            <h2 className="text-2xl font-black uppercase tracking-[0.12em] text-white">
              How It Works
            </h2>
            <ol className="mt-4 grid gap-3 text-sm leading-6 text-cyan-100/70">
              {rules.map((rule) => (
                <li className="border-l border-cyan-300/40 pl-4" key={rule}>
                  {rule}
                </li>
              ))}
            </ol>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {featureCards.map((card) => (
              <article
                className="border border-cyan-300/15 bg-[#071015]/85 p-4"
                key={card.title}
              >
                <h3 className="text-sm font-black uppercase tracking-[0.12em] text-cyan-100">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-cyan-100/65">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
