// src/HomePage.jsx
import { useNavigate, useLocation, Link } from "react-router-dom";
import { auth } from "./auth";
import QASection from "./landing/components/QASection.jsx";
import Contact from "./landing/components/Contact.jsx"; // ✅ import Contact

export default function HomePage() {
  const nav = useNavigate();
  const loc = useLocation();

  const handleSignIn = () => {
    auth.signIn("mike@example.com"); // fake sign-in for now
    const dest = loc.state?.from || "/app";
    nav(dest);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {/* NAV */}
      <header className="navbar bg-white shadow">
        <div className="flex-1">
          <span className="btn btn-ghost normal-case text-xl">LeagueVault</span>
        </div>
        <div className="flex-none gap-2">
          {auth.isSignedIn() ? (
            <>
              <span className="hidden text-gray-600 sm:inline">
                {auth.currentUser()}
              </span>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  auth.signOut();
                  nav(0); // refresh to update buttons
                }}
              >
                Sign out
              </button>
              <Link className="btn btn-primary" to="/app">
                Enter App
              </Link>
            </>
          ) : (
            <button className="btn btn-primary" onClick={handleSignIn}>
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-bold leading-tight">
          Your league’s history, <span className="text-primary">unlocked</span>.
        </h1>
        <p className="mt-4 text-lg text-gray-700">
          Upload ESPN data, explore career stats, trades, placements, and
          head-to-head in seconds.
        </p>
        <div className="mt-8 flex gap-3">
          {auth.isSignedIn() ? (
            <Link className="btn btn-primary" to="/app">
              Enter App
            </Link>
          ) : (
            <button className="btn btn-primary" onClick={handleSignIn}>
              Get started
            </button>
          )}
          <Link className="btn btn-outline" to="/app">
            View demo
          </Link>
        </div>
      </section>

      {/* FAQ + Contact */}
      <QASection />
      <Contact />
