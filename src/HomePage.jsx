// src/HomePage.jsx
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAppContext } from "./contexts/AppContext.jsx";
import QASection from "./landing/components/QASection.jsx";
import Contact from "./landing/components/Contact.jsx"; // ✅ import Contact

export default function HomePage() {
  const nav = useNavigate();
  const loc = useLocation();
  const { isSignedIn, user, signOut } = useAppContext();

  const handleSignIn = () => {
    const dest = loc.state?.from || "/app";
    nav("/signin", {
      state: { from: dest },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      {/* NAV */}
      <header className="navbar bg-white shadow">
        <div className="flex-1">
          <span className="btn btn-ghost normal-case text-xl">LeagueVault</span>
        </div>
        <nav className="flex-none flex items-center gap-2">
          <a href="#contact" className="btn btn-ghost normal-case">
            Contact
          </a>
          <div className="dropdown dropdown-end">
            <label
              tabIndex={0}
              className="btn btn-ghost btn-circle avatar placeholder"
            >
              <div className="bg-primary/10 text-primary rounded-full w-12">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.866 0-7 3.134-7 7h2c0-2.761 2.239-5 5-5s5 2.239 5 5h2c0-3.866-3.134-7-7-7z" />
                </svg>
              </div>
            </label>
            <ul
              tabIndex={0}
              className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-48"
            >
              {isSignedIn ? (
                <>
                  <li className="font-semibold text-gray-600 px-2 py-1">
                    Hi, {user || "Manager"}
                  </li>
                  <li>
                    <Link to="/app">Enter App</Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        nav("/", { replace: true });
                      }}
                    >
                      Sign out
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <button type="button" onClick={handleSignIn}>
                      Sign in
                    </button>
                  </li>
                  <li>
                    <Link to="/signup">Sign up</Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </nav>
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
          {isSignedIn ? (
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
