import BlockTitle from "./BlockTitle.jsx";
import { Link } from "react-router-dom";

export default function Pricing() {
  return (
    <section id="pricing" className="vault-panel">
    <div className="vault-panel__inner max-w-6xl mx-auto">
        <BlockTitle title="Pricing" text="Simple plans as you grow" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border p-6 bg-white">
            <h3 className="text-xl font-semibold">League Member</h3>
            <p className="text-slate-600 mt-2">$30 / year</p>
            <p className="text-slate-500 text-sm mt-1">
              Get up to 5 leagues across any platform.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>• All data: H2H matchups, Career stats, Monetary analysis, Luck Index</li>
              <li>• Weekly Outlooks</li>
              <li>• Yearly Recaps</li>
              <li>• 5 leagues at a time</li>
            </ul>
            <Link to="/app" className="btn btn-primary mt-6">
              Get started
            </Link>
          </div>
          <div className="rounded-xl border p-6 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Commissioner</h3>
              <span className="badge badge-primary badge-outline text-xs uppercase tracking-wide">
                Best Value
              </span>
            </div>
            <p className="text-slate-600 mt-2">$50 / year</p>
            <p className="text-slate-500 text-sm mt-1">
              Unlimited leagues with access for everyone in them.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>• All data: H2H matchups, Career stats, Monetary analysis, Luck Index</li>
              <li>• Weekly Outlooks</li>
              <li>• Yearly Recaps</li>
              <li>• Unlimited leagues</li>
              <li>• Access for your league mates</li>
            </ul>
            <Link to="/app" className="btn btn-primary mt-6">
              Start now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
