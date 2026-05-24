import Link from "next/link";

const rules = [
  "Reveal nodes to restore safe parts of the power grid.",
  "Numbers report how many nearby nodes are corrupted.",
  "Quarantine suspected threats before opening their sector.",
  "Restore every safe node to complete the mission.",
];

const featureCards = [
  {
    title: "Corrupted Grid Logic",
    body: "A 10x10 city network hides 15 corrupted nodes behind dark tiles.",
  },
  {
    title: "Quarantine Markers",
    body: "Flag hidden cells when the pattern suggests a dangerous node.",
  },
  {
    title: "Command-Center Flow",
    body: "Track status, flags, and safe restores from a compact mission panel.",
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
            BLACKOUT GRID
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
              BLACKOUT GRID
            </h1>
            <p className="mt-5 text-xl font-semibold text-cyan-100 sm:text-2xl">
              Restore the city grid before the blackout spreads.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-cyan-100/70">
              A rogue signal has corrupted hidden nodes inside the city power
              network. Reveal safe nodes, quarantine threats, and keep the
              mission under control.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="border border-cyan-300 bg-cyan-300 px-6 py-3 text-center text-sm font-black uppercase tracking-[0.16em] text-[#021012] transition hover:bg-cyan-200"
                href="/play"
              >
                Start Mission
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
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 25 }, (_, index) => {
                const isThreat = [4, 11, 18].includes(index);
                const isFlagged = [7, 21].includes(index);
                const isOpen = [0, 1, 2, 5, 6, 10, 12, 16].includes(index);

                return (
                  <div
                    className={[
                      "flex aspect-square items-center justify-center border text-center text-sm font-black sm:text-base",
                      isThreat
                        ? "border-red-400 bg-[#2a0808] text-red-100"
                        : isFlagged
                          ? "border-amber-400 bg-[#201307] text-amber-200"
                          : isOpen
                            ? "border-[#24434b] bg-[#101b21] text-cyan-100/70"
                            : "border-[#15343b] bg-[#071117]",
                    ].join(" ")}
                    key={index}
                  >
                    {isThreat ? "X" : isFlagged ? "Q" : isOpen && index % 3 ? "1" : ""}
                  </div>
                );
              })}
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
