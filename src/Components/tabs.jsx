  const handleSubmit = async (event) => {
      type: "loading",
      message: "Sending your idea…",

    try {
      const response = await fetch("https://formsubmit.co/ajax/mikedoto1@gmail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          category: selected,
          idea: trimmed,
          source: "LeagueVault What's Coming roadmap form",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send");
      }

      setStatus({
        type: "success",
        message: "Thanks! Your idea is on its way to the LeagueVault team.",
      });
      setIdea("");
    } catch (error) {
      console.error("Error sending roadmap idea", error);
      setStatus({
        type: "error",
        message: "We couldn't send your idea. Please try again in a moment.",
      });
    }
              disabled={!idea.trim() || status.type === "loading"}
              {status.type === "loading" ? "Sending…" : "Send to LeagueVault"}
            {status.type === "loading" && (
              <div className="rounded-full border border-amber-300/50 bg-amber-100/80 px-4 py-1.5 text-xs font-semibold text-amber-700 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100">
                {status.message}
              </div>
            )}
