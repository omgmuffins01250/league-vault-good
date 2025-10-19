import React from "react";

export function SidebarButton({ children, active, onClick, disabled }) {
  const baseClasses =
    "group relative flex w-full items-center justify-start gap-2 overflow-hidden rounded-2xl px-4 py-2.5 text-left text-sm font-semibold tracking-wide transition-all duration-200 backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60";

  const stateClasses = disabled
    ? "cursor-not-allowed border border-white/10 bg-white/5 opacity-40"
    : active
    ? "-translate-y-[1px] border border-amber-300/60 bg-gradient-to-r from-amber-200/85 via-amber-100/70 to-white/80 text-amber-900 shadow-[0_24px_55px_-24px_rgba(251,191,36,0.75)] dark:from-amber-500/30 dark:via-amber-400/20 dark:to-amber-500/25 dark:text-amber-100"
    : "border border-white/10 bg-white/5 text-slate-200/80 hover:-translate-y-[2px] hover:border-white/25 hover:bg-white/10 hover:text-white";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${stateClasses}`}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
      {!disabled && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 ${
            active
              ? "bg-[radial-gradient(110%_140%_at_0%_0%,rgba(253,230,138,0.35),transparent_65%),radial-gradient(120%_150%_at_100%_120%,rgba(253,230,138,0.25),transparent_65%)]"
              : "bg-[radial-gradient(120%_150%_at_0%_0%,rgba(255,255,255,0.12),transparent_70%)] opacity-0 group-hover:opacity-100"
          }`}
        />
      )}
    </button>
  );
}

export function Card({
  className = "",
  children,
  title,
  subtitle,
  right,
  allowOverflow = false,
}) {
  const isTitlePrimitive =
    typeof title === "string" || typeof title === "number";
  const titleNode =
    title == null
      ? null
      : isTitlePrimitive
      ? (
          <span className="bg-gradient-to-r from-[#f6f8fc] via-[#d5deeb] to-[#a9b6c9] bg-clip-text text-transparent drop-shadow">
            {String(title)}
          </span>
        )
      : title;

  const renderTitle =
    titleNode == null
      ? null
      : isTitlePrimitive
      ? (
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-100">
            {titleNode}
          </h3>
        )
      : titleNode;

  const isRightPrimitive =
    typeof right === "string" || typeof right === "number";
  const renderRight =
    right == null
      ? null
      : isRightPrimitive
      ? (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {String(right)}
          </span>
        )
      : right;

  const cardClasses = [
    "relative",
    allowOverflow ? null : "overflow-hidden",
    "rounded-3xl border border-white/30 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 shadow-[0_30px_65px_-40px_rgba(15,23,42,0.85)] backdrop-blur-xl",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClasses}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(110%_130%_at_0%_0%,rgba(92,105,134,0.16),transparent_60%),radial-gradient(120%_140%_at_100%_100%,rgba(135,151,176,0.12),transparent_60%)]" />
        <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />
      </div>
      {(renderTitle || renderRight || subtitle) && (
        <div className="relative z-10 px-5 py-4 flex flex-col gap-1 border-b border-white/60 dark:border-white/10 bg-white/90 dark:bg-zinc-950/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            {renderTitle ? <div className="min-w-0 flex-1">{renderTitle}</div> : null}
            {renderRight ? (
              <div
                className={`${renderTitle ? "" : "ml-auto"} flex items-center gap-2`}
              >
                {renderRight}
              </div>
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
