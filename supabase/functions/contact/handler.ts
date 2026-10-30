type ContactEnvironment = {
  get: (name: string) => string | undefined;
};

type ContactHandlerOptions = {
  env: ContactEnvironment;
  fetcher?: typeof fetch;
};

type ContactMessage = {
  name: string;
  email: string;
  message: string;
};

const allowedOrigins = new Set([
  "https://exampro-ht.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const controlCharacters = /\p{Cc}/u;

function jsonResponse(body: Record<string, string | boolean>, status: number, origin?: string) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function validateMessage(input: unknown): ContactMessage | null {
  if (!input || typeof input !== "object") return null;

  const data = input as Record<string, unknown>;
  if (
    typeof data["name"] !== "string" ||
    typeof data["email"] !== "string" ||
    typeof data["message"] !== "string"
  ) {
    return null;
  }

  const name = data["name"].trim();
  const email = data["email"].trim();
  const message = data["message"].replace(/\r\n?/g, "\n").trim();
  if (
    !name ||
    name.length > 120 ||
    controlCharacters.test(name) ||
    !email ||
    email.length > 254 ||
    controlCharacters.test(email) ||
    !emailPattern.test(email) ||
    !message ||
    message.length > 5000 ||
    controlCharacters.test(message.replace(/[\n\t]/g, ""))
  ) {
    return null;
  }

  return { name, email, message };
}

export function createContactHandler({ env, fetcher = fetch }: ContactHandlerOptions) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin") ?? undefined;
    if (origin && !allowedOrigins.has(origin)) {
      return jsonResponse({ error: "Request origin is not allowed." }, 403);
    }

    if (request.method === "OPTIONS") {
      const headers = new Headers({
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      });
      if (origin) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Vary", "Origin");
      }
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, origin);
    }

    const contentType = request.headers.get("Content-Type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return jsonResponse({ error: "A JSON request body is required." }, 415, origin);
    }

    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return jsonResponse({ error: "The request body could not be read." }, 400, origin);
    }
    if (new TextEncoder().encode(rawBody).byteLength > 6000) {
      return jsonResponse({ error: "The request body is too large." }, 413, origin);
    }

    let input: unknown;
    try {
      input = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "The request body is not valid JSON." }, 400, origin);
    }

    const message = validateMessage(input);
    if (!message) {
      return jsonResponse(
        { error: "Enter a valid name, email address, and message." },
        400,
        origin,
      );
    }

    const apiKey = env.get("RESEND_API_KEY");
    const recipient = env.get("CONTACT_TO_EMAIL");
    if (!apiKey || !recipient) {
      return jsonResponse({ error: "The contact email service is not configured." }, 503, origin);
    }

    const configuredSender = env.get("CONTACT_FROM_EMAIL")?.trim();
    const sender = configuredSender || "EXAMPRO <onboarding@resend.dev>";
    const recipientIsTestAddress = recipient.toLowerCase().endsWith("@resend.dev");
    const senderIsResendTestAddress = sender.includes("onboarding@resend.dev");
    if (senderIsResendTestAddress && !recipientIsTestAddress) {
      return jsonResponse(
        { error: "A verified sender domain is required to send to this recipient." },
        503,
        origin,
      );
    }

    let resendResponse: Response;
    try {
      resendResponse = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: sender,
          to: [recipient],
          reply_to: message.email,
          subject: "Nouveau message de contact EXAMPRO",
          text: `Nom complet: ${message.name}\nAdresse e-mail: ${message.email}\n\nMessage:\n${message.message}`,
        }),
      });
    } catch {
      return jsonResponse(
        { error: "The contact email service could not be reached." },
        502,
        origin,
      );
    }

    if (!resendResponse.ok) {
      return jsonResponse(
        { error: "The contact email service rejected the message." },
        502,
        origin,
      );
    }

    let resendResult: unknown;
    try {
      resendResult = await resendResponse.json();
    } catch {
      return jsonResponse(
        { error: "The contact email service returned an invalid response." },
        502,
        origin,
      );
    }

    if (
      !resendResult ||
      typeof resendResult !== "object" ||
      !("id" in resendResult) ||
      typeof resendResult.id !== "string" ||
      !resendResult.id
    ) {
      return jsonResponse(
        { error: "The contact email service did not confirm the message." },
        502,
        origin,
      );
    }

    return jsonResponse({ success: true }, 200, origin);
  };
}
