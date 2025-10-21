import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="mt-24 border-t border-slate-700/40 bg-slate-950/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            LeagueVault
          </p>
          <h3 className="text-2xl font-semibold text-slate-100">
            Preserve every season’s lore.
          </h3>
          <p className="text-sm text-slate-400">
            Import your league history, explore the data, and keep the receipts
            for every rivalry.
          </p>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-8 text-sm text-slate-400 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-300/80">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="hover:text-amber-300/80">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-amber-300/80">
                  Pricing
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-300/80">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:support@leaguevault.app" className="hover:text-amber-300/80">
                  Support
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-amber-300/80">
                  Contact
                </a>
              </li>
              <li>
                <Link to="/signin" className="hover:text-amber-300/80">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-300/80">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="hover:text-amber-300/80">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-amber-300/80">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/app" className="hover:text-amber-300/80">
                  App
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800/50 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} LeagueVault. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
