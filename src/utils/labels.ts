const SLOT_LABELS: Record<number, string> = {
  0: "QB",
  1: "QB",
  2: "RB",
  3: "WR",
  4: "WR",
  5: "WR",
  6: "TE",
  7: "FLEX",
  8: "FLEX",
  9: "FLEX",
  10: "FLEX",
  11: "FLEX",
  12: "FLEX",
  13: "FLEX",
  14: "FLEX",
  15: "FLEX",
  16: "D/ST",
  17: "K",
  18: "Bench",
  19: "Bench",
  20: "Bench",
  21: "IR",
  22: "IR",
  23: "FLEX",
  24: "FLEX",
  25: "OP",
  26: "Bench",
  27: "Bench",
};

const POSITION_LABELS: Record<number, string> = {
  0: "QB",
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  6: "RB/WR",
  7: "RB/WR/TE",
  16: "D/ST",
  17: "K",
  18: "P",
  19: "HC",
};

export function slotLabel(slotId: number | null | undefined): string {
  if (slotId == null) return "Slot";
  return SLOT_LABELS[Number(slotId)] || `Slot ${slotId}`;
}

export function posLabel(defaultPositionId: number | null | undefined): string {
  if (defaultPositionId == null) return "";
  return POSITION_LABELS[Number(defaultPositionId)] || `POS ${defaultPositionId}`;
}

export function normalizePlayerName(input: string): string {
  return String(input || "")
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/[.'"\-]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v|vi)\b/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
