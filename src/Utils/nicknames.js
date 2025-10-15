export function sanitizeNicknameList(list) {
  const arr = Array.isArray(list) ? list : [list];
  const seen = new Set();
  const out = [];
  for (const value of arr) {
    if (value == null) continue;
    const str = String(value).trim();
    if (!str) continue;
    const key = str.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(str);
  }
  return out;
}

export function normalizeNicknameMap(source) {
  if (!source || typeof source !== "object") return {};
  const out = {};
  Object.entries(source).forEach(([owner, list]) => {
    const sanitized = sanitizeNicknameList(list);
    if (sanitized.length > 0) {
      out[String(owner)] = sanitized;
    }
  });
  return out;
}
