import BlockTitle from "./BlockTitle.jsx";
import { Link } from "react-router-dom";

export default function Pricing() {
  return (
    <section id="pricing" className="vault-panel">
    <div className="vault-panel__inner max-w-6xl mx-auto">
        <BlockTitle title="Pricing" text="Simple plans as you grow" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-xl border p-6 bg-white">
            <h3 className="text-xl font-semibold">Free</h3>
            <p className="text-slate-600 mt-2">1 league • demo data</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>• Upload ESPN export</li>
              <li>• Career & H2H tabs</li>
              <li>• Screenshots & sharing</li>
            </ul>
            <Link to="/app" className="btn btn-primary mt-6">
              Get started
            </Link>
          </div>
          <div className="rounded-xl border p-6 bg-white">
            <h3 className="text-xl font-semibold">League</h3>
            <p className="text-slate-600 mt-2">$5 / mo per league</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>• All Free features</li>
              <li>• Trades & Draft tabs</li>
              <li>• Multi-season history</li>
            </ul>
            <Link to="/app" className="btn btn-primary mt-6">
              Start trial
            </Link>
          </div>
          <div className="rounded-xl border p-6 bg-white">
            <h3 className="text-xl font-semibold">Commissioner</h3>
            <p className="text-slate-600 mt-2">$15 / mo</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>• Multi-league dashboard</li>
              <li>• Priority support</li>
              <li>• Export & backups</li>
            </ul>
            <Link to="/app" className="btn btn-primary mt-6">
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
