import React from "react";

export function SidebarButton({ children, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-sm btn-block justify-start ${
        active ? "btn-primary" : "btn-ghost"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

export function Card({ className = "", children, title, subtitle, right }) {
  const titleNode =
    typeof title === "string" ? (
      <span className="bg-gradient-to-r from-[#f6f8fc] via-[#d5deeb] to-[#a9b6c9] bg-clip-text text-transparent drop-shadow">
        {title}
      </span>
    ) : (
      title
    );

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/30 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 shadow-[0_30px_65px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(110%_130%_at_0%_0%,rgba(92,105,134,0.16),transparent_60%),radial-gradient(120%_140%_at_100%_100%,rgba(135,151,176,0.12),transparent_60%)]" />
        <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
      </div>
      {(title || right || subtitle) && (
        <div className="relative z-10 px-5 py-4 flex flex-col gap-1 border-b border-white/60 dark:border-white/10 bg-white/90 dark:bg-zinc-950/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            {title ? (
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-100">
                {titleNode}
              </h3>
            ) : null}
            {right ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{right}</div>
            ) : null}
          </div>
          {subtitle ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{subtitle}</p>
          ) : null}
        </div>
      )}
      <div className="relative z-10 p-5 md:p-6 text-sm text-slate-700 dark:text-slate-200">
        {children}
      </div>
    </div>
  );
}

/** Wraps a table with consistent borders, zebra, hover */
export function TableBox({ children, className = "" }) {
  return (
    <div className={"overflow-auto rounded-xl shadow " + className}>
      <table className="table table-zebra table-sm w-full">{children}</table>
    </div>
  );
}

export function Footer() {
  return (
    <div className="mt-10 text-xs text-zinc-500 text-center">
      Fantasy League Analyzer demo · Built with React
    </div>
  );
}
