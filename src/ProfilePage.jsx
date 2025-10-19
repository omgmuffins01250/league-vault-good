import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "./contexts/AppContext.jsx";

function buildProfile(email) {
  return {
    name: "Mike Johnson",
    email: email || "mike@example.com",
    joined: "January 12, 2024",
    subscription: {
      plan: "LeagueVault Pro",
      status: "Active",
      renewal: "Renews on May 12, 2025",
      seats: 3,
      paymentMethod: "Visa ending in ••24",
    },
    security: {
      twoFactor: true,
      lastPasswordChange: "March 4, 2025",
      devices: [
        "MacBook Pro · San Francisco, CA",
        "Pixel 8 · New York, NY",
        "iPad Air · Chicago, IL",
      ],
    },
    notifications: {
      productUpdates: true,
      weeklyDigest: false,
      securityAlerts: true,
      billingUpdates: true,
    },
    preferences: {
      timezone: "Eastern Time (ET)",
      defaultLeague: "Gotham Gridiron League",
      defaultView: "Season overview dashboard",
      emailReports: "Mondays at 9:00 AM",
    },
  };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAppContext();
  const email = user;
  const profile = useMemo(() => buildProfile(email), [email]);

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  return (
    <div className="vault-page text-slate-100">
      <div className="vault-page__inner flex min-h-screen flex-col pb-16">
        <header className="mx-auto mt-12 w-[min(1100px,92vw)] rounded-3xl border border-white/12 bg-white/10 px-6 py-6 shadow-[0_35px_90px_-60px_rgba(15,23,42,0.85)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                to="/"
                className="text-2xl font-semibold tracking-wide text-white"
              >
                LeagueVault
              </Link>
              <p className="mt-2 max-w-xl text-sm text-slate-300/80">
                Manage your profile, subscription, and account preferences. Keep
                everything aligned with your league history.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-amber-300/60 hover:text-amber-300"
                to="/app"
              >
                Enter App
              </Link>
              <button
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-rose-300/60 hover:text-rose-200"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-[min(1100px,92vw)] flex-1 space-y-8 pt-10">
          <section className="rounded-3xl border border-white/12 bg-white/10 p-8 shadow-[0_40px_95px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-white">Account overview</h1>
                <p className="mt-2 text-sm text-slate-300/80">
                  Keep your profile details up to date so teammates always know
                  how to reach you.
                </p>
              </div>
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/10 text-amber-300 shadow-[0_22px_55px_-35px_rgba(251,191,36,0.75)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-12 w-12"
                >
                  <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.73 0-8 2.38-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.62-3.27-5-8-5z" />
                </svg>
              </div>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <dl className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Name
                </dt>
                <dd className="text-lg font-medium text-white">{profile.name}</dd>
              </dl>
              <dl className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Email
                </dt>
                <dd className="text-lg font-medium text-white/90 break-words">
                  {profile.email}
                </dd>
              </dl>
              <dl className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Member since
                </dt>
                <dd className="text-lg font-medium text-white">{profile.joined}</dd>
              </dl>
              <dl className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Current plan
                </dt>
                <dd className="text-lg font-medium text-white">
                  {profile.subscription.plan}
                </dd>
              </dl>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
            <div className="rounded-3xl border border-white/12 bg-white/10 p-8 shadow-[0_40px_95px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Subscription</h2>
                  <p className="mt-1 text-sm text-slate-300/80">
                    Manage your plan, billing details, and upgrade options.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
                  {profile.subscription.status}
                </span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Renewal
                  </dt>
                  <dd className="mt-2 text-base font-medium text-white">
                    {profile.subscription.renewal}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Seats in use
                  </dt>
                  <dd className="mt-2 text-base font-medium text-white">
                    {profile.subscription.seats} of 5
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Payment method
                  </dt>
                  <dd className="mt-2 text-base font-medium text-white">
                    {profile.subscription.paymentMethod}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/5 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Billing cycle
                  </dt>
                  <dd className="mt-2 text-base font-medium text-white">Annual</dd>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
                <button className="inline-flex items-center justify-center rounded-full border border-amber-300/60 bg-amber-400/10 px-4 py-2 text-amber-200 transition hover:bg-amber-400/20">
                  Upgrade plan
                </button>
                <button className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-slate-200 transition hover:border-rose-300/60 hover:text-rose-200">
                  Cancel subscription
                </button>
                <button className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition hover:border-white/30">
                  Manage payment method
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/12 bg-white/10 p-8 shadow-[0_40px_95px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-white">Security</h2>
              <ul className="mt-4 space-y-4 text-sm text-slate-200">
                <li className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/5 px-4 py-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/50 bg-emerald-400/10 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    2FA
                  </span>
                  <div>
                    <p className="font-semibold text-white">Two-factor authentication</p>
                    <p className="text-slate-300/80">
                      {profile.security.twoFactor
                        ? "Enabled via authenticator app"
                        : "Not enabled"}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/5 px-4 py-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300/50 bg-white/10 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                    PWD
                  </span>
                  <div>
                    <p className="font-semibold text-white">Password updated</p>
                    <p className="text-slate-300/80">
                      {profile.security.lastPasswordChange}
                    </p>
                  </div>
                </li>
              </ul>
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Active devices
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-200/90">
                  {profile.security.devices.map((device) => (
                    <li key={device} className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-300"></span>
                      {device}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
                <button className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-slate-200 transition hover:border-amber-300/60 hover:text-amber-200">
                  Update password
                </button>
                <button className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition hover:border-white/30">
                  Manage devices
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/12 bg-white/10 p-8 shadow-[0_40px_95px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-white">Notifications</h2>
              <div className="mt-6 space-y-4">
                <NotificationToggle
                  label="Product updates"
                  description="Release notes and new feature announcements."
                  defaultChecked={profile.notifications.productUpdates}
                />
                <NotificationToggle
                  label="Weekly digest"
                  description="Snapshot of your leagues delivered Monday morning."
                  defaultChecked={profile.notifications.weeklyDigest}
                />
                <NotificationToggle
                  label="Security alerts"
                  description="Sign-in attempts and account changes."
                  defaultChecked={profile.notifications.securityAlerts}
                />
                <NotificationToggle
                  label="Billing updates"
                  description="Receipts, invoices, and renewal reminders."
                  defaultChecked={profile.notifications.billingUpdates}
                />
              </div>
            </div>
            <div className="rounded-3xl border border-white/12 bg-white/10 p-8 shadow-[0_40px_95px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-white">Preferences</h2>
              <dl className="mt-6 grid gap-5 text-sm text-slate-200">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Time zone
                  </dt>
                  <dd className="mt-2 text-base font-medium text-white">
                    {profile.preferences.timezone}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Default league
                  </dt>
                  <dd className="mt-2 text-base font-medium text-white">
                    {profile.preferences.defaultLeague}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Default dashboard view
                  </dt>
                  <dd className="mt-2 text-base font-medium text-white">
                    {profile.preferences.defaultView}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Email reports
                  </dt>
                  <dd className="mt-2 text-base font-medium text-white">
                    {profile.preferences.emailReports}
                  </dd>
                </div>
              </dl>
              <div className="mt-6 rounded-2xl border border-white/12 bg-white/5 p-5 text-sm text-slate-200/90">
                <p className="font-semibold text-white">Need to transfer ownership?</p>
                <p className="mt-1 text-slate-300/80">
                  Contact support to move billing, update organization details, or
                  request a data export.
                </p>
                <Link
                  className="mt-3 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-300/60 hover:text-amber-200"
                  to="/#contact"
                >
                  Contact support
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function NotificationToggle({ label, description, defaultChecked }) {
  return (
    <label className="flex items-start gap-4 rounded-2xl border border-white/12 bg-white/5 px-4 py-3">
      <input
        type="checkbox"
        className="toggle toggle-warning"
        defaultChecked={defaultChecked}
      />
      <span className="space-y-1">
        <span className="block font-semibold text-white">{label}</span>
        <span className="block text-sm text-slate-300/80">{description}</span>
      </span>
    </label>
  );
}
