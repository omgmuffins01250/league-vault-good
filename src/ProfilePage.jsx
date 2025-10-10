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
    <div className="min-h-screen bg-slate-100 text-gray-900">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/" className="text-2xl font-bold text-primary">
              LeagueVault
            </Link>
            <p className="mt-1 text-gray-600">
              Manage your profile, subscription, and account preferences.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link className="btn btn-ghost" to="/app">
              Enter App
            </Link>
            <button className="btn btn-outline" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-8">
        <section className="card bg-white shadow">
          <div className="card-body">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Account overview</h1>
                <p className="text-gray-600">
                  Keep your profile details up to date so teammates always know
                  how to reach you.
                </p>
              </div>
              <div className="avatar placeholder">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-14 w-14"
                  >
                    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.73 0-8 2.38-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.62-3.27-5-8-5z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <dl className="space-y-1">
                <dt className="text-sm uppercase tracking-wide text-gray-600">
                  Name
                </dt>
                <dd className="text-lg font-medium text-gray-900">{profile.name}</dd>
              </dl>
              <dl className="space-y-1">
                <dt className="text-sm uppercase tracking-wide text-gray-600">
                  Email
                </dt>
                <dd className="text-lg font-medium break-words text-gray-900">
                  {profile.email}
                </dd>
              </dl>
              <dl className="space-y-1">
                <dt className="text-sm uppercase tracking-wide text-gray-600">
                  Member since
                </dt>
                <dd className="text-lg font-medium text-gray-900">{profile.joined}</dd>
              </dl>
              <dl className="space-y-1">
                <dt className="text-sm uppercase tracking-wide text-gray-600">
                  Current plan
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {profile.subscription.plan}
                </dd>
              </dl>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="card bg-white shadow lg:col-span-2">
            <div className="card-body space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="card-title">Subscription</h2>
                  <p className="text-gray-600">
                    Manage your plan, billing details, and upgrade options.
                  </p>
                </div>
                <span className="badge badge-success badge-outline">
                  {profile.subscription.status}
                </span>
              </div>
              <div className="rounded-box bg-slate-100 p-4">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-semibold uppercase text-gray-600">
                      Renewal
                    </dt>
                    <dd className="text-base font-medium text-gray-900">
                      {profile.subscription.renewal}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold uppercase text-gray-600">
                      Seats in use
                    </dt>
                    <dd className="text-base font-medium text-gray-900">
                      {profile.subscription.seats} of 5
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold uppercase text-gray-600">
                      Payment method
                    </dt>
                    <dd className="text-base font-medium text-gray-900">
                      {profile.subscription.paymentMethod}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold uppercase text-gray-600">
                      Billing cycle
                    </dt>
                    <dd className="text-base font-medium text-gray-900">Annual</dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary">Upgrade plan</button>
                <button className="btn btn-outline">Cancel subscription</button>
                <button className="btn btn-ghost">Manage payment method</button>
              </div>
            </div>
          </div>
          <div className="card bg-white shadow">
            <div className="card-body space-y-4">
              <h2 className="card-title">Security</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="badge badge-primary badge-sm mt-1">2FA</span>
                  <div>
                    <p className="font-semibold text-gray-900">Two-factor authentication</p>
                    <p className="text-gray-600">
                      {profile.security.twoFactor
                        ? "Enabled via authenticator app"
                        : "Not enabled"}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="badge badge-neutral badge-sm mt-1">Pwd</span>
                  <div>
                    <p className="font-semibold text-gray-900">Password updated</p>
                    <p className="text-gray-600">
                      {profile.security.lastPasswordChange}
                    </p>
                  </div>
                </li>
              </ul>
              <div>
                <p className="mb-2 text-sm font-semibold uppercase text-gray-600">
                  Active devices
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  {profile.security.devices.map((device) => (
                    <li key={device} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-success"></span>
                      {device}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-outline btn-sm">Update password</button>
                <button className="btn btn-ghost btn-sm">Manage devices</button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card bg-white shadow">
            <div className="card-body space-y-4">
              <h2 className="card-title">Notifications</h2>
              <div className="space-y-4">
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
          </div>
          <div className="card bg-white shadow">
            <div className="card-body space-y-4">
              <h2 className="card-title">Preferences</h2>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-semibold uppercase text-gray-600">
                    Time zone
                  </dt>
                  <dd className="text-base font-medium text-gray-900">
                    {profile.preferences.timezone}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase text-gray-600">
                    Default league
                  </dt>
                  <dd className="text-base font-medium text-gray-900">
                    {profile.preferences.defaultLeague}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase text-gray-600">
                    Default dashboard view
                  </dt>
                  <dd className="text-base font-medium text-gray-900">
                    {profile.preferences.defaultView}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase text-gray-600">
                    Email reports
                  </dt>
                  <dd className="text-base font-medium text-gray-900">
                    {profile.preferences.emailReports}
                  </dd>
                </div>
              </dl>
              <div className="rounded-box bg-slate-100 p-4 text-sm text-gray-600">
                <p className="font-semibold text-gray-900">
                  Need to transfer ownership?
                </p>
                <p>
                  Contact support to move billing, update organization details, or
                  request a data export.
                </p>
                <Link className="btn btn-link px-0" to="/#contact">
                  Contact support
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function NotificationToggle({ label, description, defaultChecked }) {
  return (
    <label className="flex items-start gap-4">
      <input
        type="checkbox"
        className="toggle toggle-primary"
        defaultChecked={defaultChecked}
      />
      <span>
        <span className="block font-semibold text-gray-900">{label}</span>
        <span className="text-sm text-gray-600">{description}</span>
      </span>
    </label>
  );
}
