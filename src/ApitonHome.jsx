// src/ApitonHome.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from "./contexts/AppContext.jsx";

// template CSS (scoped to the landing page)
import "./landing/assets/css/style.css";
import "./landing/assets/css/responsive.css";
import "./landing/assets/css/apton-icons.css";
import "./landing/assets/css/fontawesome-all.min.css";

import Banner from "./landing/components/Banner.jsx";
import Features from "./landing/components/Features.jsx";
import Pricing from "./landing/components/Pricing.jsx";
import QASection from "./landing/components/QASection.jsx";
import Contact from "./landing/components/Contact.jsx"; // ← optional
import Footer from "./landing/components/Footer.jsx";
import CartDropdown from "./Components/CartDropdown.jsx";

export default function ApitonHome() {
  const nav = useNavigate();
  const loc = useLocation();
  const { isSignedIn, user, signOut } = useAppContext();
  const currentUser = user;
  const userInitial = currentUser ? currentUser.charAt(0).toUpperCase() : "?";

  const handleSignOut = () => {
    signOut();
    nav("/", { replace: true });
  };

  const handleSignInNavigate = () => {
    nav("/signin", { state: { from: loc.pathname + loc.search + loc.hash } });
  };

  const handleProfileNavigate = () => {
    nav("/profile");
  };

  return (
    <div className="vault-page text-slate-100">
      <div className="vault-page__inner flex min-h-screen flex-col">
        {/* NAV */}
        <header className="sticky top-0 z-20 flex justify-center px-3 pt-6">
          <div className="flex w-[min(1100px,92vw)] items-center justify-between gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm shadow-[0_24px_70px_-45px_rgba(15,23,42,0.85)] backdrop-blur-xl">
            <span className="text-lg font-semibold tracking-wide text-white">
              LeagueVault
            </span>
            <nav className="flex items-center gap-2 text-[13px] font-medium text-slate-200/90">
              <a className="rounded-full px-3 py-1.5 transition hover:bg-white/10" href="#features">
                Features
              </a>
              <a className="rounded-full px-3 py-1.5 transition hover:bg-white/10" href="#pricing">
                Pricing
              </a>
              <a className="rounded-full px-3 py-1.5 transition hover:bg-white/10" href="#faq">
                FAQ
              </a>
              <a className="rounded-full px-3 py-1.5 transition hover:bg-white/10" href="#contact">
                Contact
              </a>
              {isSignedIn && <CartDropdown />}
              {isSignedIn && (
                <Link className="btn btn-vault btn-sm" to="/app">
                  Enter App
                </Link>
              )}
              <div className="dropdown dropdown-end">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-ghost btn-circle avatar border border-white/10 bg-white/10 text-white"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <span className="font-semibold">{userInitial}</span>
                  </div>
                </div>
                <ul
                  tabIndex={0}
                  className="menu menu-sm dropdown-content mt-3 w-60 rounded-2xl border border-white/10 bg-slate-900/90 p-3 text-[13px] shadow-2xl backdrop-blur"
                >
                  {isSignedIn ? (
                    <>
                      <li className="menu-title">
                        <span className="uppercase text-xs text-slate-400">Signed in as</span>
                      </li>
                      <li>
                        <span className="break-all text-sm font-medium text-slate-200">
                          {currentUser}
                        </span>
                      </li>
                      <li>
                        <button onClick={handleProfileNavigate}>View profile</button>
                      </li>
                      <li>
                        <button onClick={handleSignOut}>Sign out</button>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <button onClick={handleSignInNavigate}>Sign in</button>
                      </li>
                      <li className="text-sm text-slate-400">
                        Sign in to manage your account and access the app.
                      </li>
                      <li className="disabled opacity-50">
                        <span>Profile (sign in required)</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </nav>
          </div>
        </header>

        {/* Sections (wrapped with IDs for anchor links) */}
        <div id="hero">
          <Banner />
        </div>

        <div id="features">
          <Features />
        </div>

        <div id="pricing">
          <Pricing />
        </div>

        {/* FAQ + Contact before footer */}
        <div id="faq">
          <QASection />
        </div>

        <div id="contact">
          <Contact />
        </div>

        <Footer />
      </div>
    </div>
  );
}
