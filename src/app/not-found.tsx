import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#0f172a_0%,_#020617_35%,_#000000_100%)] px-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-md">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-300">
          404
        </p>
        <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
          Seite nicht gefunden
        </h1>
        <p className="mt-4 text-base text-slate-300">
          Die gewünschte Seite existiert nicht oder wurde verschoben.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-500"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </main>
  );
}
