  const [contact, setContact] = useState("");
  const handleSubmit = async (event) => {
    setStatus({ type: "submitting", message: "" });
    try {
      const response = await fetch("/api/feature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: trimmed,
          category,
          contact: contact.trim(),
          page: "UpdatesComingSoonTab",
          company: "",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Unable to send your idea right now.");
      }
      setStatus({
        type: "success",
        message: "Thanks! Your idea is on our radar.",
      });
      setIdea("");
      setContact("");
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.message || "Something went wrong. Please try again shortly.",
      });
    }
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            onChange={() => {
              /* honeypot field intentionally left blank */
            }}
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
              placeholder="Leave your email or Discord tag if you want a follow-up."
            />
          </label>
              disabled={!idea.trim() || status.type === "submitting"}
              {status.type === "submitting" ? "Sending…" : "Send to LeagueVault"}
