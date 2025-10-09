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
  return (
    <div
      className={`rounded-xl bg-white dark:bg-zinc-900 shadow border border-zinc-300 dark:border-zinc-700 ${className}`}
    >
      {(title || right || subtitle) && (
        <div className="px-4 pt-4 pb-2 flex items-end justify-between gap-3 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            {title && <h3 className="text-sm font-medium">{title}</h3>}
            {subtitle && (
              <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {right ? <div className="text-xs">{right}</div> : null}
        </div>
      )}
      <div className="p-4">{children}</div>
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
