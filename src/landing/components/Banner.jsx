// src/landing/components/Banner.jsx
import React from "react";
import { Link } from "react-router-dom";
import hero from "../assets/images/app-shots/app-shot-n-1-1.png";

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
                See Screens
              </a>
            </div>
          </div>

          {/* Right visual */}
          <div className="vault-card rounded-2xl overflow-hidden p-2">
            <img
              src={hero}
              alt="LeagueVault preview"
              className="w-full h-auto rounded-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
