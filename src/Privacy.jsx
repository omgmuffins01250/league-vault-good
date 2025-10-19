
import React from "react";

export default function Privacy() {
  return (
    <div className="vault-page text-slate-100">
      <div className="vault-page__inner flex min-h-screen items-center justify-center px-4 py-16">
        <article className="w-[min(760px,92vw)] space-y-6 rounded-3xl border border-white/12 bg-white/10 p-8 shadow-[0_40px_95px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl md:p-12">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Policy
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Privacy Policy – Fantasy Importer
            </h1>
          </header>
          <p className="text-sm leading-relaxed text-slate-200/90">
            Fantasy Importer does not collect, transmit, or share any personal data.
            All processing happens locally in your browser. Your league data is only
            read from pages you are already signed into (ESPN or Sleeper) and is never
            sent to any external server.
          </p>
          <p className="text-sm leading-relaxed text-slate-200/90">
            The extension uses permissions such as <code className="rounded bg-black/40 px-1 py-0.5 text-[0.7rem] text-amber-200">activeTab</code>, scripting,
            and storage solely to retrieve and display your fantasy league information
            within your LeagueVault account. No analytics, tracking, or advertising is
            included.
          </p>
          <p className="text-sm leading-relaxed text-slate-200/90">
            If you have any questions, contact us at{' '}
            <a
              className="font-semibold text-amber-200 underline-offset-4 transition hover:text-amber-300 hover:underline"
              href="mailto:mikedoto1@gmail.com"
            >
              mikedoto1@gmail.com
            </a>
            .
          </p>
        </article>
      </div>
    </div>
  );
}
