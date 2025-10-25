import React, { useState } from "react";
import { Card } from "./ui.jsx";

const ROADMAP_CATEGORIES = [
  { value: "new-sport", label: "New sport" },
  { value: "new-platform", label: "New fantasy platform" },
  { value: "new-stats", label: "New statistics" },
  { value: "new-graphics", label: "New graphics" },
  { value: "other", label: "Other" },
];

const UPCOMING_FEATURES = [
  "Auction drafts",
  "Yahoo leagues",
  "Fantasy baseball",
  "Fantasy basketball",
];

const IDLE_STATUS = { type: "idle", message: "" };
const PENDING_STATUS = { type: "pending", message: "Sending your idea…" };
const SUCCESS_STATUS = {
  type: "success",
  message: "Thanks! Your idea is on its way.",
};

const GENERIC_ERROR_MESSAGE = "We couldn't send that just yet. Please try again.";

const makeErrorStatus = (message) => ({
  type: "error",
  message: message || GENERIC_ERROR_MESSAGE,
});

export function UpdatesComingSoonTab() {
  const [category, setCategory] = useState(ROADMAP_CATEGORIES[0].value);
  const [idea, setIdea] = useState("");
  const [contact, setContact] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState(IDLE_STATUS);

  const resetStatus = () => setStatus(IDLE_STATUS);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedIdea = idea.trim();

    if (!trimmedIdea) {
      setStatus(
        makeErrorStatus("Please share a quick note before sending."),
      );
      return;
    }

    const selectedCategory =
      ROADMAP_CATEGORIES.find((option) => option.value === category)?.label ||
      category;

    const trimmedContact = contact.trim();
    setStatus(PENDING_STATUS);

    try {
      const response = await fetch("/api/feature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: trimmedIdea,
          category: selectedCategory,
          categoryValue: category,
          contact: trimmedContact || undefined,
          page: "updates-coming",
          company: honeypot,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(
          (data && typeof data.error === "string" && data.error) ||
            GENERIC_ERROR_MESSAGE,
        );
      }

      setStatus(SUCCESS_STATUS);
      setIdea("");
      setContact("");
      setHoneypot("");
    } catch (error) {
      setStatus(
        makeErrorStatus(
          error instanceof Error && error.message ? error.message : undefined,
        ),
      );
    }
  };

  const isSending = status.type === "pending";

  return (
    <div className="space-y-6">
      <Card
        title="What we're building next"
        subtitle="A peek at the features already in motion."
      >
        <ul className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {UPCOMING_FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 rounded-2xl border border-white/20 bg-white/70 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <span className="mt-[6px] h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Help shape the roadmap"
        subtitle="We’re always listening for the next great idea."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            We are always looking to add more features that our community wants to
            see. Tell us what you want next and we’ll put it on the list.
          </p>
          <input
            type="text"
            name="company"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="pointer-events-none absolute -m-px h-0 w-0 border-0 p-0 opacity-0"
            aria-hidden="true"
          />
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Category
            <select
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 dark:border-white/10 dark:bg-zinc-950/70 dark:text-slate-200"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                resetStatus();
              }}
            >
              {ROADMAP_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Your idea
            <textarea
              rows={5}
              className="min-h-[140px] w-full resize-y rounded-2xl border border-white/40 bg-white/80 px-3 py-3 text-sm leading-relaxed text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 dark:border-white/10 dark:bg-zinc-950/70 dark:text-slate-200"
              value={idea}
              onChange={(event) => {
                setIdea(event.target.value);
                if (status.type !== "idle") {
                  resetStatus();
                }
              }}
              placeholder="Share the feature, stat, or experience you want to see."
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Contact (optional)
            <input
              type="text"
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm leading-relaxed text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 dark:border-white/10 dark:bg-zinc-950/70 dark:text-slate-200"
              value={contact}
              onChange={(event) => {
                setContact(event.target.value);
                if (status.type !== "idle") {
                  resetStatus();
                }
              }}
              placeholder="Drop your email or Discord handle so we can follow up."
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-amber-300/60 bg-amber-200/80 px-5 py-2 text-sm font-semibold text-amber-900 shadow-[0_20px_45px_-30px_rgba(251,191,36,0.8)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 disabled:opacity-60 dark:bg-amber-400/30 dark:text-amber-100"
              disabled={!idea.trim() || isSending}
            >
              {isSending ? "Sending…" : "Send to LeagueVault"}
            </button>
            {status.type === "error" && (
              <div className="rounded-full border border-rose-300/50 bg-rose-100/80 px-4 py-1.5 text-xs font-semibold text-rose-700 shadow-sm dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200">
                {status.message}
              </div>
            )}
            {status.type === "pending" && (
              <div className="rounded-full border border-amber-300/50 bg-amber-100/80 px-4 py-1.5 text-xs font-semibold text-amber-700 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
                {status.message}
              </div>
            )}
            {status.type === "success" && (
              <div className="rounded-full border border-emerald-300/50 bg-emerald-100/80 px-4 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                {status.message}
              </div>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

export default UpdatesComingSoonTab;
