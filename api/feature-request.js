const MIN_IDEA_LENGTH = 3;

const coerceString = (value) =>
  (typeof value === "string" ? value.trim() : undefined) || undefined;

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
};

const pickFirst = (value) => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const looksLikeEmail = (value) => !!value && /.+@.+\..+/.test(value);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = parseBody(req) || {};
  const idea = coerceString(body.idea);
  const category = coerceString(body.category);
  const categoryValue = coerceString(body.categoryValue);
  const contact = coerceString(body.contact);
  const page = coerceString(body.page);
  const honeypot = coerceString(body.company);

  if (honeypot) {
    // Silently accept suspected bot submissions.
    return res.status(200).json({ ok: true });
  }

  if (!idea || idea.length < MIN_IDEA_LENGTH) {
    return res
      .status(400)
      .json({ ok: false, error: "Please share a little more detail before sending." });
  }

  const ownerEmail =
    coerceString(process.env.OWNER_EMAIL) || coerceString(process.env.ROADMAP_OWNER_EMAIL);
  const fromEmail =
    coerceString(process.env.FROM_EMAIL) || coerceString(process.env.ROADMAP_FROM_EMAIL);
  const resendKey = coerceString(process.env.RESEND_API_KEY);

  if (!ownerEmail || !fromEmail || !resendKey) {
    console.error("Feature request endpoint is missing required environment variables.");
    return res
      .status(500)
      .json({ ok: false, error: "Feature requests are temporarily unavailable." });
  }

  const ipHeader = pickFirst(req.headers["x-forwarded-for"]) || req.socket.remoteAddress || "";
  const userAgent = pickFirst(req.headers["user-agent"]) || "";
  const requestOrigin = pickFirst(req.headers["origin"]) || pickFirst(req.headers["referer"]) || "";

  const lines = [
    "New roadmap submission received.",
    "",
    `Category: ${category || "—"}`,
    `Category value: ${categoryValue || "—"}`,
    `Contact: ${contact || "—"}`,
    `Page: ${page || "—"}`,
    requestOrigin ? `Origin: ${requestOrigin}` : undefined,
    "",
    idea,
    "",
    "—",
    `IP: ${ipHeader || "unknown"}`,
    `User Agent: ${userAgent || "unknown"}`,
    `Received: ${new Date().toISOString()}`,
  ].filter(Boolean);

  const subjectParts = ["New roadmap idea"];
  if (category) {
    subjectParts.push(`(${category})`);
  }

  const emailPayload = {
    from: fromEmail,
    to: ownerEmail,
    subject: subjectParts.join(" "),
    text: lines.join("\n"),
  };

  if (looksLikeEmail(contact)) {
    emailPayload.reply_to = contact;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Resend API error", response.status, errorBody);
      return res
        .status(502)
        .json({ ok: false, error: "We couldn't send that just yet. Please try again." });
    }
  } catch (error) {
    console.error("Failed to send roadmap idea", error);
    return res
      .status(502)
      .json({ ok: false, error: "We couldn't send that just yet. Please try again." });
  }

  return res.status(200).json({ ok: true });
}
