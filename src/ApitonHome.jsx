// src/ApitonHome.jsx
import { useNavigate, useLocation } from "react-router-dom";
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

  const handleEnterVault = () => {
    if (isSignedIn) {
      nav("/app");
      return;
    }
    handleSignInNavigate();
  };

  return (
    <div className="vault-page text-slate-100">
      <div className="vault-page__inner flex min-h-screen flex-col">
        {/* NAV */}
        <header className="sticky top-0 z-20 flex justify-center px-3 pt-6 sm:px-6">
          <div className="flex w-full max-w-[1100px] flex-wrap items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm shadow-[0_24px_70px_-45px_rgba(15,23,42,0.85)] backdrop-blur-xl">
            <div className="flex items-center gap-3 text-white">
              <span className="text-lg font-semibold tracking-wide">LeagueVault</span>
            </div>
            <nav className="order-3 flex w-full flex-wrap items-center justify-center gap-1 text-[13px] font-medium text-slate-200/90 sm:order-none sm:w-auto sm:flex-1 sm:justify-center md:gap-2">
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
            </nav>
            <div className="order-2 ml-auto flex flex-1 items-center justify-end gap-2 sm:order-none sm:flex-none sm:justify-end sm:gap-3">
              <CartDropdown />
              <button
                type="button"
                className="btn btn-vault h-11 rounded-full px-6 text-[12px] font-semibold uppercase tracking-[0.28em]"
                onClick={handleEnterVault}
              >
                Enter Vault
              </button>
              <div className="dropdown dropdown-end">
                <button
                  tabIndex={0}
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:border-white/30 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                  aria-label="Account menu"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                    <path d="M4.7 19.2a7.5 7.5 0 0 1 14.6 0" />
                  </svg>
                </button>
                <ul
                  tabIndex={0}
                  className="menu menu-sm dropdown-content mt-3 w-56 rounded-2xl border border-white/10 bg-slate-900/95 p-3 text-[13px] shadow-2xl backdrop-blur"
                >
                  {isSignedIn ? (
                    <>
                      {currentUser && (
                        <li className="px-2 pb-2 text-[12px] text-slate-400">
                          <span className="block text-[11px] uppercase tracking-[0.2em] text-slate-500">Signed in as</span>
                          <span className="break-all text-slate-200">{currentUser}</span>
                        </li>
                      )}
                      <li>
                        <button onClick={handleProfileNavigate}>View profile</button>
                      </li>
                      <li>
                        <button onClick={handleSignOut}>Sign out</button>
                      </li>
                    </>
                  ) : (
                    <li>
                      <button onClick={handleSignInNavigate}>Sign in</button>
                    </li>
                  )}
                </ul>
              </div>
            </div>
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
