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
          <div className="alert alert-success mb-4">
            <span>{statusMessage}</span>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          {MEMBERSHIP_PLANS.map((plan) => (
            <div key={plan.id} className="rounded-xl border p-6 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                {plan.badge && (
                  <span className="badge badge-primary badge-outline text-xs uppercase tracking-wide">
                    {plan.badge}
                  </span>
                )}
              </div>
              <p className="text-slate-600 mt-2">
                ${plan.price} / {plan.billingInterval}
              </p>
              <p className="text-slate-500 text-sm mt-1">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {plan.perks.map((perk) => (
                  <li key={perk}>• {perk}</li>
                ))}
              </ul>
              <button
                type="button"
                className="btn btn-primary mt-6"
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
