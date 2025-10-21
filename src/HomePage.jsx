// src/HomePage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Features from "./landing/components/Features.jsx";
import AppScreen from "./landing/components/AppScreen.jsx";
import Pricing from "./landing/components/Pricing.jsx";
import QASection from "./landing/components/QASection.jsx";
import Contact from "./landing/components/Contact.jsx";
import BlockTitle from "./landing/components/BlockTitle.jsx";
import { useAppContext } from "./contexts/AppContext.jsx";
import "./landing/assets/css/style.css";

const ORBIT_LINKS = [
  { label: "App Tour", href: "#screens" },
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

function PersonIcon({ className = "" }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Zm-3.75 7.5c-3.728 0-6.75 2.186-6.75 4.875 0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125 0-2.689-3.022-4.875-6.75-4.875Z"
      />
    </svg>
  );
}

function CartIcon({ className = "" }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25h9.75c.621 0 1.125-.504 1.125-1.125 0-.102-.014-.204-.04-.303l-1.2-4.497a1.125 1.125 0 0 0-1.085-.825H6.732m0 0L5.106 4.272A1.125 1.125 0 0 0 3.99 3.75H2.25M6.732 6.375l1.79 6.705M10.5 19.125a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  );
}

function SignOutIcon({ className = "" }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m-3 0 3-3m0 0-3-3m3 3H9"
      />
    </svg>
  );
}

export default function HomePage() {
  const nav = useNavigate();
  const loc = useLocation();
  const {
    isSignedIn,
    user,
    signOut,
    cart,
    cartCount,
    removeFromCart,
  } = useAppContext();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const userMenuRef = useRef(null);
  const cartDialogRef = useRef(null);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0), 0),
    [cart]
  );

  const handleSignIn = () => {
    const dest = loc.state?.from || "/app";
    nav("/signin", {
      state: { from: dest },
    });
  };

  const handleEnterVault = () => {
    if (isSignedIn) {
      nav("/app");
    } else {
      handleSignIn();
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const firstItem = cart[0];
    if (!isSignedIn) {
      nav("/signup", {
        state: firstItem ? { cartIntent: firstItem.id } : undefined,
      });
    } else {
      nav("/app");
    }
    setCartOpen(false);
  };

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const handleClick = (event) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!cartOpen) return undefined;
    const handleClick = (event) => {
      if (!cartDialogRef.current) return;
      if (!cartDialogRef.current.contains(event.target)) {
        setCartOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setCartOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [cartOpen]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(110%_120%_at_20%_0%,rgba(76,86,196,0.24),transparent_60%),radial-gradient(90%_90%_at_80%_20%,rgba(250,204,21,0.2),transparent_70%),linear-gradient(180deg,#05070d_0%,#0a101a_55%,#05070d_100%)]" />
        <div className="absolute inset-0 opacity-60 mix-blend-screen bg-[radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.15),transparent_70%)]" />

        <div className="relative z-10 flex min-h-screen flex-col px-6 py-8 sm:px-10">
          <header className="flex items-center justify-between">
            <div className="hidden text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 md:block">
              League history, preserved.
            </div>
            <div className="ml-auto flex items-center gap-3 sm:gap-4">
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen((open) => !open);
                    setCartOpen(false);
                  }}
                  className="group rounded-full border border-white/15 bg-white/5 p-2 transition hover:border-white/40 hover:bg-white/10"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <PersonIcon className="h-5 w-5 text-slate-200 transition group-hover:text-white" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-sm shadow-[0_22px_60px_-30px_rgba(15,23,42,0.75)]">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Account
                    </div>
                    <div className="space-y-2">
                      <div className="rounded-xl bg-white/5 px-3 py-2 text-[13px] font-medium text-slate-200">
                        {isSignedIn ? `Hi, ${user || "Manager"}` : "You're browsing"}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleEnterVault();
                          setUserMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-[13px] font-semibold uppercase tracking-[0.22em] text-slate-100 transition hover:border-white/40 hover:bg-white/5"
                      >
                        Enter the Vault
                        <span aria-hidden className="text-xs text-amber-300">
                          ↗
                        </span>
                      </button>
                      {isSignedIn ? (
                        <>
                          <Link
                            to="/profile"
                            className="block rounded-xl border border-white/10 px-3 py-2 text-[13px] font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/5"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            View profile
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              signOut();
                              setUserMenuOpen(false);
                              nav("/", { replace: true });
                            }}
                            className="flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-[13px] font-semibold text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-500/10"
                          >
                            Sign out
                            <SignOutIcon className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            handleSignIn();
                            setUserMenuOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-[13px] font-semibold uppercase tracking-[0.22em] text-slate-100 transition hover:border-white/40 hover:bg-white/5"
                        >
                          Sign in
                          <span aria-hidden className="text-xs text-amber-300">
                            →
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(true);
                    setUserMenuOpen(false);
                  }}
                  className="group rounded-full border border-white/15 bg-white/5 p-2 transition hover:border-white/40 hover:bg-white/10"
                  aria-haspopup="dialog"
                  aria-expanded={cartOpen}
                >
                  <CartIcon className="h-5 w-5 text-slate-200 transition group-hover:text-white" />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-lg">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col items-center justify-center">
            <div className="mx-auto w-full max-w-4xl">
              <div className="flex flex-col items-center gap-6 text-center">
                <h1 className="text-center text-[clamp(2.35rem,8vw,5.5rem)] font-black uppercase tracking-[0.28em] text-white sm:tracking-[0.4em] lg:tracking-[0.6em]">
                  LeagueVault
                </h1>
                <div className="flex flex-wrap justify-center gap-3">
                  {ORBIT_LINKS.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-200/80 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.85)] transition hover:border-white/40 hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:text-xs"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <p className="max-w-xl text-center text-[11px] uppercase tracking-[0.28em] text-slate-400 sm:tracking-[0.34em]">
                  Every matchup. Every memory. Instantly searchable.
                </p>
                <button
                  type="button"
                  onClick={handleEnterVault}
                  className="inline-flex items-center gap-3 rounded-full border border-amber-400/50 bg-amber-300/15 px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.4em] text-amber-100 transition hover:-translate-y-[1px] hover:border-amber-300 hover:bg-amber-300/25"
                >
                  Enter the Vault
                  <span aria-hidden className="text-xs">↗</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div
            ref={cartDialogRef}
            className="w-[min(92vw,420px)] rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-slate-100 shadow-[0_32px_85px_-40px_rgba(15,23,42,0.95)]"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Shopping Cart
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">Your picks</h2>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-300 transition hover:border-white/40 hover:bg-white/5"
              >
                Close
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="mt-8 text-sm text-slate-300/80">
                Your cart is empty. Explore our plans to add something.
              </p>
            ) : (
              <>
                <ul className="mt-6 space-y-4 max-h-60 overflow-y-auto pr-2">
                  {cart.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-xs text-slate-300/80">
                          ${item.price} / {item.billingInterval}
                        </p>
                        {item.description ? (
                          <p className="mt-2 text-xs text-slate-400">{item.description}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-slate-200 transition hover:border-white/40 hover:bg-white/5"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-300/80">
                    Total
                  </span>
                  <span className="text-lg font-semibold text-amber-200">
                    ${total.toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="mt-4 w-full rounded-full border border-amber-400/50 bg-amber-300/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-amber-100 transition hover:-translate-y-[1px] hover:border-amber-300 hover:bg-amber-300/40"
                >
                  Checkout
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <section id="about" className="vault-panel">
        <div className="vault-panel__inner mx-auto max-w-5xl space-y-6 text-slate-100">
          <BlockTitle
            title="Built for fantasy commissioners"
            text="LeagueVault keeps every season within reach."
          />
          <div className="grid gap-6 md:grid-cols-2">
            <article className="vault-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-100">All your history, one hub</h3>
              <p className="mt-3 text-sm text-slate-300/85">
                Import league data and instantly browse placements, trades, drafts and head-to-head matchups without digging through spreadsheets.
              </p>
            </article>
            <article className="vault-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-100">Shareable insights</h3>
              <p className="mt-3 text-sm text-slate-300/85">
                Surface storylines for your league mates with rich visual summaries, ready-made exports, and season-over-season comparisons.
              </p>
            </article>
          </div>
        </div>
      </section>

      <AppScreen />
      <Features />
      <Pricing />
      <QASection />
      <Contact />
    </div>
  );
}
