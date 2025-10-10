import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "./contexts/AppContext.jsx";
import { getPlanById } from "./Utils/memberships";

export default function SignInPage() {
  const { isSignedIn, signIn, addToCart } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const fromLocation = location.state?.from || "/app";
  const cartIntent = location.state?.cartIntent;

  useEffect(() => {
    if (isSignedIn) {
      navigate(fromLocation, { replace: true });
    }
  }, [isSignedIn, fromLocation, navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    setError("");
    signIn(email.trim());
    if (cartIntent) {
      const plan = getPlanById(cartIntent);
      if (plan) {
        addToCart(plan);
      }
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-base-100 shadow-xl rounded-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Sign in</h1>
        <p className="text-center text-base-content/70 mb-8">
          Access your LeagueVault account to manage memberships and leagues.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="form-control">
            <span className="label-text">Email</span>
            <input
              type="email"
              className="input input-bordered"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text">Password</span>
            <input
              type="password"
              className="input input-bordered"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="text-error text-sm">{error}</p>}
          <button type="submit" className="btn btn-primary w-full">
            Sign in
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
          <span>Don't have an account? </span>
          <Link
            to="/signup"
            state={location.state}
            className="link link-primary font-medium"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
