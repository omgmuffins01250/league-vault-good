import { compressToUTF16, decompressFromUTF16 } from "lz-string";

const RAW_PREFIX = "__RAW__";
const FLZ_PREFIX = "__FLZ__";

function stripPrefix(raw, prefix) {
  if (typeof raw !== "string") return null;
  return raw.slice(prefix.length);
}

export function decodePayloadString(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(RAW_PREFIX)) {
    return stripPrefix(trimmed, RAW_PREFIX);
  }

  if (trimmed.startsWith(FLZ_PREFIX)) {
    const body = stripPrefix(trimmed, FLZ_PREFIX);
    if (!body) return null;
    try {
      const json = decompressFromUTF16(body);
      return typeof json === "string" && json ? json : null;
    } catch (error) {
      console.warn("Failed to decompress payload", error);
      return null;
    }
  }

  return trimmed;
}

export function parsePayloadString(raw) {
  const json = decodePayloadString(raw);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Failed to parse payload JSON", error);
    return null;
  }
}

export function encodePayloadForWindowName(payload, { compress = false } = {}) {
  try {
    const json = JSON.stringify(payload);
    if (!json) return null;
    if (compress) {
      try {
        const compressed = compressToUTF16(json);
        if (compressed) {
          return `${FLZ_PREFIX}${compressed}`;
        }
      } catch (error) {
        console.warn("Failed to compress payload", error);
      }
    }
    return `${RAW_PREFIX}${json}`;
  } catch (error) {
    console.warn("Failed to encode payload", error);
    return null;
  }
}
