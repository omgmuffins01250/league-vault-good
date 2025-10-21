// src/landing/components/Banner.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Banner() {
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Vault panel hero */}
        <div className="vault-hero grid md:grid-cols-2 gap-10 items-center">
          {/* Left copy */}
          <div>
            <h1 className="vault-title text-5xl md:text-6xl font-extrabold leading-tight">
              Your league’s history, <span className="brass">unlocked</span>.
            </h1>

            <p className="vault-sub mt-4 text-lg">
              Upload ESPN data and explore career stats, trades, placements, and
              head-to-head in seconds.
            </p>

            <div className="mt-8 flex gap-3">
              <Link className="btn btn-vault" to="/app">
                Enter App
              </Link>
              <a className="btn btn-keycard" href="#features">
                Explore Features
              </a>
            </div>
          </div>

          {/* Right visual */}
          <div className="vault-card rounded-2xl overflow-hidden p-2">
            <div
              className="w-full rounded-xl bg-gradient-to-br from-indigo-500/30 via-amber-400/20 to-transparent p-8 text-sm text-slate-200"
              aria-hidden="true"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300/80">
                Live league insights
              </div>
              <p className="mt-4 text-2xl font-semibold text-slate-100">
                Draft boards, trade ledgers, rivalries, and more—organized automatically.
              </p>
              <p className="mt-4 text-sm text-slate-200/80">
                Import a JSON export and LeagueVault builds the story for every season.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
