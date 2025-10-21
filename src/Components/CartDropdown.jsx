import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts/AppContext.jsx";

export default function CartDropdown() {
  const { cart, cartCount, removeFromCart, clearCart } = useAppContext();
  const navigate = useNavigate();

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0), 0),
    [cart]
  );

  const handleViewCart = () => {
    navigate("/app?view=cart");
  };

  const handleCheckout = () => {
    navigate("/app?view=checkout");
  };

  return (
    <div className="dropdown dropdown-end">
      <button
        tabIndex={0}
        type="button"
        role="button"
        aria-label="Shopping cart"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:border-white/30 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="9" cy="21" r="1.25" />
          <circle cx="19" cy="21" r="1.25" />
          <path d="M3.5 4h2.2a1 1 0 0 1 .97.76l2.3 9.02a1 1 0 0 0 .97.76h8.64a1 1 0 0 0 .97-.76l1.61-6.1a1 1 0 0 0-.97-1.24H7.16" />
        </svg>
        {cartCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-semibold text-white shadow-lg">
            {cartCount}
          </span>
        )}
      </button>
      <div
        tabIndex={0}
        className="dropdown-content mt-3 w-80 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 text-slate-100 shadow-[0_20px_45px_-25px_rgba(15,23,42,0.9)] backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Shopping cart
          </p>
          <span className="text-sm font-semibold text-white">${total}</span>
        </div>
        {cart.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-300/80">Your cart is empty.</div>
        ) : (
          <ul className="max-h-56 space-y-4 overflow-y-auto px-5 py-4">
            {cart.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-slate-900/80 p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold leading-snug text-white">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-300/80">
                    ${item.price} / {item.billingInterval}
                  </p>
                  {item.description && (
                    <p className="text-xs text-slate-400/80">{item.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-200 transition hover:border-rose-400/60 hover:text-rose-200"
                  onClick={() => removeFromCart(item.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 border-t border-white/5 px-5 py-4">
          <button
            type="button"
            className="btn btn-outline btn-sm h-10 rounded-full border-white/20 bg-white/5 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-100 hover:border-white/40 hover:bg-white/10"
            onClick={handleViewCart}
          >
            See cart
          </button>
          <button
            type="button"
            className="btn btn-vault btn-sm h-10 rounded-full text-[12px] font-semibold uppercase tracking-[0.18em]"
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            Check out
          </button>
          <button
            type="button"
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 transition hover:text-slate-200"
            onClick={clearCart}
            disabled={cart.length === 0}
          >
            Clear cart
          </button>
        </div>
      </div>
    </div>
  );
}
