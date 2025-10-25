const textDecoder = new TextDecoder();

async function readBody(req) {
  if (req.body) {
    if (typeof req.body === "string") return req.body;
    try {
      return JSON.stringify(req.body);
    } catch {
      return "";
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (!chunks.length) return "";
  return textDecoder.decode(Buffer.concat(chunks));
}

function safeJsonParse(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const rawBody = await readBody(req);
    const payload = safeJsonParse(rawBody);

    const idea = typeof payload.idea === "string" ? payload.idea.trim() : "";
    if (idea.length < 3) {
      res.status(400).json({ ok: false, error: "Message too short" });
      return;
    }

    const honeypot = typeof payload.company === "string" ? payload.company.trim() : "";
    if (honeypot) {
      res.status(200).json({ ok: true });
      return;
    }

    const category =
      typeof payload.category === "string" && payload.category.trim().length > 0
        ? payload.category.trim()
        : "Uncategorized";
    const contact =
      typeof payload.contact === "string" && payload.contact.trim().length > 0
        ? payload.contact.trim()
        : "";

    const ownerEmail = process.env.OWNER_EMAIL || "";
    const fromEmail = process.env.FROM_EMAIL || "";
    const resendApiKey = process.env.RESEND_API_KEY || "";

    if (!ownerEmail || !fromEmail || !resendApiKey) {
      console.error("Feature request missing email configuration", {
        hasOwner: Boolean(ownerEmail),
        hasFrom: Boolean(fromEmail),
        hasResendKey: Boolean(resendApiKey),
      });
      res.status(500).json({ ok: false, error: "Email service is not configured" });
      return;
    }

    const subject = `New roadmap idea (${category})`;
    const lines = [
      `Category: ${category}`,
      `Idea: ${idea}`,
    ];
    if (contact) {
      lines.push(`Contact: ${contact}`);
    }
    if (payload.page) {
      lines.push(`Page: ${payload.page}`);
    }
    if (payload.leagueId) {
      lines.push(`League: ${payload.leagueId}`);
    }
    lines.push("");
    lines.push(`Submitted: ${new Date().toISOString()}`);
    if (req.headers["user-agent"]) {
      lines.push(`User-Agent: ${req.headers["user-agent"]}`);
    }
    if (req.headers["x-forwarded-for"] || req.socket?.remoteAddress) {
      lines.push(
        `IP: ${req.headers["x-forwarded-for"] || req.socket?.remoteAddress || ""}`
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: ownerEmail,
        subject,
        text: lines.join("\n"),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error", errorText);
      res
        .status(502)
        .json({ ok: false, error: "Failed to send your request. Please try again." });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Feature request handler failed", error);
    res
      .status(500)
      .json({ ok: false, error: "Unexpected error while sending your request." });
  }
}
