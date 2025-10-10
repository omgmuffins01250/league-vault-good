import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "../auth";
import { getPlanById } from "../Utils/memberships";

const AppContext = createContext(null);
const CART_STORAGE_KEY = "lv_cart";

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Failed to parse stored cart", error);
    return [];
  }
}

function readStoredCart() {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!stored) return [];
  const parsed = safeParse(stored);
  if (!Array.isArray(parsed)) return [];
  return parsed;
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => auth.currentUser());
  const [cart, setCart] = useState(() => readStoredCart());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleStorage = (event) => {
      if (event.key === "lv_user") {
        setUser(auth.currentUser());
      }
      if (event.key === CART_STORAGE_KEY) {
        setCart(readStoredCart());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const persistCart = (nextCart) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));
  };

  const signIn = (email) => {
    auth.signIn(email);
    setUser(email);
  };

  const signOut = () => {
    auth.signOut();
    setUser(null);
    setCart([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  };

  const addToCart = (plan) => {
    const planData = typeof plan === "string" ? getPlanById(plan) : plan;
    if (!planData) return false;
    let added = false;
    setCart((prev) => {
      if (prev.some((item) => item.id === planData.id)) {
        return prev;
      }
      const next = [...prev, planData];
      persistCart(next);
      added = true;
      return next;
    });
    return added;
  };

  const removeFromCart = (planId) => {
    setCart((prev) => {
      const next = prev.filter((item) => item.id !== planId);
      persistCart(next);
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isSignedIn: Boolean(user),
      signIn,
      signOut,
      cart,
      cartCount: cart.length,
      addToCart,
      removeFromCart,
      clearCart,
    }),
    [user, cart]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

export default AppContext;
