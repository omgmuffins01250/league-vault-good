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
import AppScreen from "./landing/components/AppScreen.jsx";
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
    <div className="apiton-landing">
      {/* NAV */}
      <header className="navbar bg-base-200 shadow">
        <div className="flex-1">
          <span className="btn btn-ghost text-xl">LeagueVault</span>
        </div>
        <nav className="flex-none flex items-center gap-2">
          <a className="btn btn-ghost" href="#features">Features</a>
          <a className="btn btn-ghost" href="#pricing">Pricing</a>
          <a className="btn btn-ghost" href="#faq">FAQ</a>
          <a className="btn btn-ghost" href="#contact">Contact</a>
          {isSignedIn && <CartDropdown />}
          {isSignedIn && (
            <Link className="btn btn-primary" to="/app">
              Enter App
            </Link>
          )}
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle avatar"
            >
              <div className="w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="font-semibold">{userInitial}</span>
              </div>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-3 shadow bg-base-100 rounded-box w-60"
            >
              {isSignedIn ? (
                <>
                  <li className="menu-title">
                    <span className="uppercase text-xs">Signed in as</span>
                  </li>
                  <li>
                    <span className="text-sm font-medium break-all">
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
                  <li className="opacity-70 text-sm">
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
      </header>

      {/* Sections (wrapped with IDs for anchor links) */}
      <div id="hero">
        <Banner />
      </div>

      <div id="features">
        <Features />
      </div>

      <div id="screens">
        <AppScreen />
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
  );
}
