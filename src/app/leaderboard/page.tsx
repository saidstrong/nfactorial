import Link from "next/link";

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col justify-center">
        <div className="border border-cyan-300/20 bg-[#071015]/90 p-6 shadow-[0_0_40px_rgba(45,212,191,0.1)]">
          <h1 className="text-4xl font-black tracking-[0.08em] text-white">
            RAID LEADERBOARD
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-cyan-100/70">
            Public raid score storage is reserved for a later phase. This local
            build keeps the route available without adding Supabase.
          </p>
          <Link
            className="mt-6 inline-flex border border-cyan-300 bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#021012] transition hover:bg-cyan-200"
            href="/play"
          >
            Start Raid
          </Link>
        </div>
      </section>
    </main>
  );
}
