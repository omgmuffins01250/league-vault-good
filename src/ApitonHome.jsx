// src/ApitonHome.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth } from "./auth";

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

export default function ApitonHome() {
  const nav = useNavigate();
  const loc = useLocation();

  const handleSignIn = () => {
    auth.signIn("mike@example.com");
    nav(loc.state?.from || "/app");
  };

  return (
    <div className="apiton-landing">
      {/* NAV */}
      <header className="navbar bg-base-200 shadow">
        <div className="flex-1">
          <span className="btn btn-ghost text-xl">LeagueVault</span>
        </div>
        <nav className="flex-none gap-2">
          <a className="btn btn-ghost" href="#features">Features</a>
          <a className="btn btn-ghost" href="#pricing">Pricing</a>
          <a className="btn btn-ghost" href="#faq">FAQ</a>
          <a className="btn btn-ghost" href="#contact">Contact</a>
          {auth.isSignedIn() ? (
            <>
              <span className="opacity-70 hidden sm:inline">{auth.currentUser()}</span>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  auth.signOut();
                  nav(0);
                }}
              >
                Sign out
              </button>
              <Link className="btn btn-primary" to="/app">Enter App</Link>
            </>
          ) : (
            <button className="btn btn-primary" onClick={handleSignIn}>
              Sign in
            </button>
          )}
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
