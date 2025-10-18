const ALIGN_CLASS = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export default function BlockTitle({
  title,
  text,
  eyebrow,
  textAlign = "center",
  titleText,
  paraText,
  className = "",
}) {
  const resolvedTitle = title ?? titleText ?? "";
  const resolvedText = text ?? paraText ?? "";
  const alignClass = ALIGN_CLASS[textAlign] ?? ALIGN_CLASS.center;

  return (
    <div
      className={`space-y-3 ${alignClass} ${className}`.trim()}
      data-testid="block-title"
    >
      {eyebrow || resolvedText ? (
        <p className="text-sm md:text-base text-slate-300/80">
          {eyebrow ?? resolvedText}
        </p>
      ) : null}
      {resolvedTitle ? (
        <h2 className="vault-headline text-3xl md:text-4xl">
          {resolvedTitle}
        </h2>
      ) : null}
    </div>
  );
}
