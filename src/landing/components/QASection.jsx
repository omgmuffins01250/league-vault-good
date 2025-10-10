// src/Components/QASection.jsx
import React, { useMemo, useState } from "react";

const DEFAULT_FAQS = {
  general: [
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
      q: "What draft data do you have?",
      a: "We store full draft boards, keeper flags, and pick-by-pick results so you can revisit every selection across seasons."
    },
    {
      q: "Do you track matchup and playoff history?",
      a: "Yes. Regular-season matchups, playoff brackets, and championship results are all archived for each season you import."
    },
    {
      q: "Can I see player performance trends?",
      a: "Absolutely. We calculate player finish deltas, positional ranks, and scoring summaries so you can analyze how each roster performed."
    },
    {
      q: "Do you include trade and waiver data?",
      a: "Trades and waiver pickups are captured when available, giving you a searchable log of roster moves over time."
    }
  ],
  payment: [
    {
      q: "Are there refunds?",
      a: "No, unfortunately we can’t offer refunds due to the format of the data. We do not want people buying the subscription, looking at what they want, and requesting a refund."
    },
    {
      q: "I bought the League Member subscription but want to upgrade. Do I have to pay for the entire thing?",
      a: "No. If you want to upgrade, you only have to pay the difference between the subscriptions."
    }
  ],
  league: [
    {
      q: "What does 'Best Drafter' mean?",
      a: "We compare a player’s position at pick vs. end-of-season finish (e.g., WR18 → WR6). The diff is weighted by pick cost and optionally de-weighted for K/DST."
    },
    {
      q: "ESPN API data only goes back to 2018. Can you see years before that?",
      a: "Yes! While the official API is limited to 2018 and later, we’ve built scrapers to pull historical data directly from old league pages. That lets us recover core stats like placements, win/loss records, and points scored. Some details (like older transaction logs) may be limited, but the important league history can still be preserved."
    },
    {
      q: "What if someone left my league or joined late?",
      a: "That’s no problem. The platform tracks each season independently, so new managers or departed ones don’t disrupt your overall history. The data automatically adjusts for changes in league membership."
    },
    {
      q: "What if a manager had to create a second ESPN account because they lost their first?",
      a: "We’ve got you covered. Our manual merge feature lets you combine multiple accounts under a single manager profile, so their stats and history stay accurate."
    },
    {
      q: "Does it matter what type of league I have?",
      a: "We support a wide variety of league formats—different roster sizes, multi-week matchups, flexible playoff schedules, and more. The only exception right now is auction drafts, which aren’t fully supported yet."
    },
    {
      q: "Can I delete or hide managers?",
      a: "Yes. If a manager left the league, you have the option to hide that manager and all their data."
    }
  ]
};

const SECTION_LABELS = {
  general: "General",
  payment: "Payment & Subscription",
  league: "League Questions"
};

export default function QASection({
  id = "faq",
  title = "Frequently Asked Questions",
  faqs = DEFAULT_FAQS
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const categorizedFaqs = useMemo(() => {
    if (Array.isArray(faqs)) {
      return { general: faqs };
    }

    return faqs;
  }, [faqs]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const sections = useMemo(() => {
    return Object.entries(categorizedFaqs).map(([key, items]) => {
      const filteredItems = (items || []).filter((item) => {
        if (!normalizedQuery) return true;
        const question = item.q?.toLowerCase() ?? "";
        const answer = item.a?.toLowerCase() ?? "";
        return question.includes(normalizedQuery) || answer.includes(normalizedQuery);
      });

      return {
        key,
        title: SECTION_LABELS[key] ?? key,
        items: filteredItems
      };
    });
  }, [categorizedFaqs, normalizedQuery]);

  const hasMatches = sections.some((section) => section.items.length > 0);

  return (
    <section id={id} className="vault-panel">
      <div className="vault-panel__inner max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          {title}
        </h2>

        <div className="max-w-xl mx-auto mb-8">
          <label htmlFor={`${id}-search`} className="sr-only">
            Search questions
          </label>
          <input
            id={`${id}-search`}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search for a question"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-8">
          {sections
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <div key={section.key}>
                <h3 className="text-xl font-semibold mb-4">
                  {section.title}
                </h3>
                <div className="space-y-3">
                  {section.items.map((item, index) => (
                    <details
                      key={`${section.key}-${index}`}
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
              </div>
            ))}
        </div>

        {!hasMatches && (
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
            No questions match your search. Try a different keyword.
          </p>
        )}

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
