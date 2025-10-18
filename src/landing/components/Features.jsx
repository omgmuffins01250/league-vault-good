import BlockTitle from "./BlockTitle.jsx";
import Slider from "./Slider.jsx";

/** --- Career (real images you already have) --- */
import career1 from "../assets/images/features/career/c1.png";
import career2 from "../assets/images/features/career/c2.png";
import career3 from "../assets/images/features/career/c3.png";
const CAREER = [career1, career2, career3];
/** --- Head-to-Head --- */
import h2h1 from "../assets/images/features/h2h/h1.png";
import h2h2 from "../assets/images/features/h2h/h2.png";
const H2H = [h2h1, h2h2];
/** --- Trades --- */
import trades1 from "../assets/images/features/trades/t1.png";
import trades2 from "../assets/images/features/trades/t2.png";
import trades3 from "../assets/images/features/trades/t3.png";
const TRADES = [trades1, trades2, trades3];

/** --- Draft --- */
import draft1 from "../assets/images/features/draft/d1.png";
import draft2 from "../assets/images/features/draft/d2.png";
const DRAFT = [draft1, draft2];

/** --- Placements --- */
import placements1 from "../assets/images/features/placements/p1.png";
import placements2 from "../assets/images/features/placements/p2.png";
const PLACEMENTS = [placements1, placements2];

/** --- Records & Milestones --- */
import records1 from "../assets/images/features/records/r1.png";
import records2 from "../assets/images/features/records/r2.png";
const RECORDS = [records1, records2];


const FEATURES = [
  {
    icon: "fas fa-chart-line",
    title: "Career Dashboards",
    blurb:
      "Lifetime W-L, total/avg points, playoff runs, titles—all rolled up per owner.",
    images: CAREER,
  },
  {
    icon: "fas fa-user-friends",
    title: "Head-to-Head",
    blurb:
      "Records vs each opponent, streaks, avg margin, and who truly owns whom.",
    images: H2H,
  },
  {
    icon: "fas fa-exchange-alt",
    title: "Trades",
    blurb:
      "See value moved, partner history, and quick winners/losers across seasons.",
    images: TRADES,
  },
  {
    icon: "fas fa-list-ol",
    title: "Draft History",
    blurb:
      "Year-by-year picks, ADP hits/misses, keepers, and which rounds you crush.",
    images: DRAFT,
  },
  {
    icon: "fas fa-ranking-star",
    title: "Placements",
    blurb:
      "Season finishes at a glance—titles, podiums, toilet bowls, and trends.",
    images: PLACEMENTS,
  },
  {
    icon: "fas fa-trophy",
    title: "Records & Milestones",
    blurb:
      "Highest scores, longest streaks, single-week heaters, and league lore.",
    images: RECORDS,
  },
];

export default function Features() {
  return (
    <section id="features" className="vault-panel">
      <div className="vault-panel__inner max-w-6xl mx-auto">
        <BlockTitle
          title="What LeagueVault shows you"
          text="Each tab, explained—tap through a few example screens."
        />

        {/* stacked layout */}
        <div className="space-y-8">
          {FEATURES.map(({ icon, title, blurb, images }) => (
            <article key={title} className="vault-card rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                  <i className={`${icon} text-lg`} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
                  <p className="mt-2 text-sm md:text-base text-slate-300/90">{blurb}</p>
                </div>
              </div>

              <div className="mt-4">
                <Slider images={images} height={260} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
