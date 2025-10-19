import React from "react";

export default function Terms() {
  return (
    <div className="vault-page text-slate-100">
      <div className="vault-page__inner flex min-h-screen items-center justify-center px-4 py-16">
        <article className="w-[min(760px,92vw)] space-y-6 rounded-3xl border border-white/12 bg-white/10 p-8 shadow-[0_40px_95px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl md:p-12">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Terms
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Terms of Service – LeagueVault
            </h1>
          </header>
          <p className="text-sm leading-relaxed text-slate-200/90">
            LeagueVault is provided as-is without warranties of any kind. By using the
            product, you agree that access may be modified or discontinued at any time
            without notice.
          </p>
          <p className="text-sm leading-relaxed text-slate-200/90">
            You are responsible for ensuring you have permission to access and import
            data from the fantasy services you connect. LeagueVault is not affiliated
            with, nor endorsed by, any third-party fantasy platform.
          </p>
          <p className="text-sm leading-relaxed text-slate-200/90">
            For questions about these terms, contact us at{' '}
            <a
              className="font-semibold text-amber-200 underline-offset-4 transition hover:text-amber-300 hover:underline"
              href="mailto:support@leaguevault.app"
            >
              support@leaguevault.app
            </a>
            .
          </p>
        </article>
      </div>
    </div>
  );
}
