  const [contact, setContact] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const handleSubmit = async (event) => {
    const trimmedContact = contact.trim();
      type: "pending",
      message: "Sending your idea…",

    try {
      const response = await fetch("/api/feature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: trimmed,
          category: selected,
          categoryValue: category,
          contact: trimmedContact || undefined,
          page: "updates-coming",
          company: honeypot,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        const message =
          (data && typeof data.error === "string" && data.error) ||
          "We couldn't send that just yet. Please try again.";
        throw new Error(message);
      }

      setStatus({
        type: "success",
        message: "Thanks! Your idea is on its way.",
      });
      setIdea("");
      setContact("");
      setHoneypot("");
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "We couldn't send that just yet. Please try again.",
      });
    }
  const isSending = status.type === "pending";

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
            Contact (optional)
            <input
              type="text"
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm leading-relaxed text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 dark:border-white/10 dark:bg-zinc-950/70 dark:text-slate-200"
              value={contact}
              onChange={(event) => {
                setContact(event.target.value);
                if (status.type !== "idle") {
                  setStatus({ type: "idle", message: "" });
                }
              }}
              placeholder="Drop your email or Discord handle so we can follow up."
            />
          </label>
              disabled={!idea.trim() || isSending}
              {isSending ? "Sending…" : "Send to LeagueVault"}
            {status.type === "pending" && (
              <div className="rounded-full border border-amber-300/50 bg-amber-100/80 px-4 py-1.5 text-xs font-semibold text-amber-700 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
                {status.message}
              </div>
            )}
