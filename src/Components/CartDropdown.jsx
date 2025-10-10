import { useMemo } from "react";
import { useAppContext } from "../contexts/AppContext.jsx";

export default function CartDropdown() {
  const { cart, cartCount, removeFromCart, clearCart } = useAppContext();

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0), 0),
    [cart]
  );

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost">
        Cart
        <span className="badge badge-primary badge-sm ml-2">{cartCount}</span>
      </div>
      <div
        tabIndex={0}
        className="mt-3 card card-compact dropdown-content w-80 bg-base-100 shadow"
      >
        <div className="card-body">
          <h3 className="card-title text-lg">Shopping cart</h3>
          {cart.length === 0 ? (
            <p className="text-sm text-base-content/70">Your cart is empty.</p>
          ) : (
            <ul className="space-y-3 max-h-64 overflow-auto pr-1">
              {cart.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="font-semibold leading-snug">{item.name}</p>
                    <p className="text-xs text-base-content/70">
                      ${item.price} / {item.billingInterval}
                    </p>
                    {item.description && (
                      <p className="text-xs text-base-content/60 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-base-content/70">
              Total: <span className="font-semibold text-base-content">${total}</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              Clear cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
