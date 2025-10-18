import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BlockTitle from "./BlockTitle.jsx";
import { useAppContext } from "../../contexts/AppContext.jsx";
import { MEMBERSHIP_PLANS } from "../../Utils/memberships";

export default function Pricing() {
  const { isSignedIn, addToCart } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [statusMessage, setStatusMessage] = useState("");
  const timeoutRef = useRef();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSelectPlan = (plan) => {
    if (!isSignedIn) {
      navigate("/signin", {
        state: {
          from: location.pathname + location.search + location.hash,
          cartIntent: plan.id,
        },
      });
      return;
    }

    const added = addToCart(plan);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    if (added) {
      setStatusMessage(`${plan.name} was added to your cart.`);
    } else {
      setStatusMessage(`${plan.name} is already in your cart.`);
    }
    timeoutRef.current = window.setTimeout(() => setStatusMessage(""), 4000);
  };

  return (
    <section id="pricing" className="vault-panel">
      <div className="vault-panel__inner max-w-6xl mx-auto">
        <BlockTitle title="Pricing" text="Simple plans as you grow" />
        {statusMessage && (
          <div className="mb-6 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
            {statusMessage}
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          {MEMBERSHIP_PLANS.map((plan) => (
            <div key={plan.id} className="vault-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-slate-100">{plan.name}</h3>
                {plan.badge && (
                  <span className="rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-xs uppercase tracking-wide text-amber-200">
                    {plan.badge}
                  </span>
                )}
              </div>
              <p className="mt-3 text-lg font-semibold text-amber-200">
                ${plan.price}
                <span className="ml-1 text-sm font-medium text-slate-300/90">
                  / {plan.billingInterval}
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-300/80">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300/90">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300/80" aria-hidden="true" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn btn-vault mt-6 w-full md:w-auto"
                onClick={() => handleSelectPlan(plan)}
              >
                Get started
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
