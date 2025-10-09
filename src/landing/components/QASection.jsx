// src/Components/QASection.jsx
import React from "react";

export default function QASection({
  id = "faq",
  title = "Frequently Asked Questions",
  faqs = [
    {
      q: "What is LeagueVault?",
      a: "LeagueVault is a fantasy football history and analytics tool. Upload your league’s CSV or use the extension and instantly browse records, trades, drafts, and more."
    },
    {
      q: "Which platforms are supported?",
      a: "Currently ESPN is supported. Yahoo/Sleeper support is planned."
    },
    {
      q: "How is my data stored?",
      a: "By default, data stays in your browser. If you sign in, you can sync to the cloud."
    },
    {
      q: "Do I need to clean the CSV?",
      a: "No. Paste or upload your export and we normalize it automatically."
    },
    {
      q: "What does 'Best Drafter' mean?",
      a: "We compare a player’s position at pick vs. end-of-season finish (e.g., WR18 → WR6). The diff is weighted by pick cost and optionally de-weighted for K/DST."
    },
    {
      q: "ESPN API data only goes back to 2018. Can you see years before that?",
      a: "Yes! While the official API is limited to 2018 and later, we’ve built scrapers to pull historical data directly from old league pages. That lets us recover core stats like placements, win/loss records, and points scored. Some details (like older transaction logs) may be limited, but the important league history can still be preserved.",
    },
    {
      q: "What if someone left my league or joined late?",
      a: "That’s no problem. The platform tracks each season independently, so new managers or departed ones don’t disrupt your overall history. The data automatically adjusts for changes in league membership.",
    },
    {
      q: "What if a manager had to create a second ESPN account because they lost their first?",
      a: "We’ve got you covered. Our manual merge feature lets you combine multiple accounts under a single manager profile, so their stats and history stay accurate.",
    },
    {
      q: "Does your data include keepers?",
      a: "Yes. Keeper designations are supported and will show up in your draft and roster history.",
    },
    {
      q: "Does it matter what type of league I have?",
      a: "We support a wide variety of league formats—different roster sizes, multi-week matchups, flexible playoff schedules, and more. The only exception right now is auction drafts, which aren’t fully supported yet.",
    },
    {
      q: "Can I delete/hide managers?",
      a: "Yes. If a manager left the league, you have the option to hide that manager and all their data.",
    },
  ]
}) {
  return (
    <section id="faq" className="vault-panel">
    <div className="vault-panel__inner max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          {title}
        </h2>

        <div className="space-y-3">
          {faqs.map((item, i) => (
            <details
              key={i}
              className="group border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
            >
              <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                <span className="font-semibold">{item.q}</span>
                <span className="ml-3 text-zinc-500 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div className="px-4 pb-4 text-sm text-zinc-600 dark:text-zinc-300">
                {item.a}
              </div>
            </details>
          ))}
        </div>

        {/* Optional CTA */}
        <div className="mt-8 text-center">
          <a href="#pricing" className="btn btn-primary">
            See Pricing
          </a>
        </div>
      </div>
    </section>
  );
}
