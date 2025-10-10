import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "./contexts/AppContext.jsx";
import { getPlanById } from "./Utils/memberships";

export default function SignUpPage() {
  const { signIn, addToCart, isSignedIn } = useAppContext();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password.trim()) {
      setError("Please create a password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-slate-900/70 backdrop-blur-sm shadow-2xl rounded-2xl p-8 border border-white/10 text-white">
        <h1 className="text-3xl font-bold text-left mb-2">Create account</h1>
        <p className="text-left text-slate-200/80 mb-8">
          Join LeagueVault and unlock premium league insights.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="form-control">
            <span className="label-text text-white text-sm font-medium">Full name</span>
            <input
              type="text"
              className="input input-bordered bg-slate-800/70 border-white/20 text-white placeholder:text-slate-300"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text text-white text-sm font-medium">Email</span>
            <input
              type="email"
              className="input input-bordered bg-slate-800/70 border-white/20 text-white placeholder:text-slate-300"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text text-white text-sm font-medium">Password</span>
            <input
              type="password"
              className="input input-bordered bg-slate-800/70 border-white/20 text-white placeholder:text-slate-300"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text text-white text-sm font-medium">Confirm password</span>
            <input
              type="password"
              className="input input-bordered bg-slate-800/70 border-white/20 text-white placeholder:text-slate-300"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          {error && <p className="text-error text-sm">{error}</p>}
          <button type="submit" className="btn btn-primary w-full">
            Sign up
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-200">
          <span>Already have an account? </span>
          <Link
            to="/signin"
            state={location.state}
            className="link link-primary font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
