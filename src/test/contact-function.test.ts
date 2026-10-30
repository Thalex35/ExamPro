import { describe, expect, it, vi } from "vitest";
import { createContactHandler } from "../../supabase/functions/contact/handler";

const validPayload = {
  name: "  Jean Pierre  ",
  email: "jean@example.com",
  message: "  Bonjour EXAMPRO\nMerci.  ",
};
const allowedOrigin = "https://exampro-ht.vercel.app";

function createRequest(body: unknown, init?: RequestInit) {
  return new Request("https://supabase.example/functions/v1/contact", {
    method: "POST",
    headers: {
      Origin: allowedOrigin,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
    ...init,
  });
}

function createHandler(fetcher: typeof fetch = fetch, envValues?: Record<string, string>) {
  return createContactHandler({
    env: { get: (name) => envValues?.[name] },
    fetcher,
  });
}

describe("contact Edge Function handler", () => {
  it("sends trimmed plain-text content via Resend and confirms only a successful response", async () => {
    const fetcher: typeof fetch = vi.fn(
      async (_input, _init) =>
        new Response(JSON.stringify({ id: "resend-message-id" }), { status: 200 }),
    );
    const handler = createHandler(fetcher, {
      RESEND_API_KEY: "test-secret",
      CONTACT_TO_EMAIL: "private-inbox@example.com",
      CONTACT_FROM_EMAIL: "EXAMPRO <verified@example.org>",
    });

    const response = await handler(createRequest(validPayload));
    const payload = await response.json();
    const options = vi.mocked(fetcher).mock.calls[0]?.[1];
    const email = JSON.parse(String(options?.body));

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(allowedOrigin);
    expect(options?.headers).toMatchObject({ Authorization: "Bearer test-secret" });
    expect(email).toEqual({
      from: "EXAMPRO <verified@example.org>",
      to: ["private-inbox@example.com"],
      reply_to: "jean@example.com",
      subject: "Nouveau message de contact EXAMPRO",
      text: "Nom complet: Jean Pierre\nAdresse e-mail: jean@example.com\n\nMessage:\nBonjour EXAMPRO\nMerci.",
    });
  });

  it("uses the configured sender address", async () => {
    const fetcher: typeof fetch = vi.fn(
      async () => new Response(JSON.stringify({ id: "ok" }), { status: 200 }),
    );
    const handler = createHandler(fetcher, {
      RESEND_API_KEY: "test-secret",
      CONTACT_TO_EMAIL: "private-inbox@example.com",
      CONTACT_FROM_EMAIL: "EXAMPRO <verified@example.org>",
    });

    await handler(createRequest(validPayload));

    const options = vi.mocked(fetcher).mock.calls[0]?.[1];
    expect(JSON.parse(String(options?.body)).from).toBe("EXAMPRO <verified@example.org>");
  });

  it("does not use the test sender for a non-test recipient", async () => {
    const fetcher: typeof fetch = vi.fn(
      async () => new Response(JSON.stringify({ id: "unexpected" }), { status: 200 }),
    );
    const handler = createHandler(fetcher, {
      RESEND_API_KEY: "test-secret",
      CONTACT_TO_EMAIL: "private-inbox@example.com",
    });

    const response = await handler(createRequest(validPayload));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "A verified sender domain is required to send to this recipient.",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects missing fields, invalid addresses, header injection, and oversized text", async () => {
    const fetcher: typeof fetch = vi.fn(
      async () => new Response(JSON.stringify({ id: "unexpected" }), { status: 200 }),
    );
    const handler = createHandler(fetcher, {
      RESEND_API_KEY: "test-secret",
      CONTACT_TO_EMAIL: "private-inbox@example.com",
      CONTACT_FROM_EMAIL: "EXAMPRO <verified@example.org>",
    });

    for (const payload of [
      { ...validPayload, name: " " },
      { ...validPayload, email: "invalid" },
      { ...validPayload, name: "Jean\r\nBcc: other@example.com" },
      { ...validPayload, message: "m".repeat(5001) },
    ]) {
      const response = await handler(createRequest(payload));
      expect(response.status).toBe(400);
    }

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not claim success when secrets are missing", async () => {
    const fetcher: typeof fetch = vi.fn();
    const handler = createHandler(fetcher, { RESEND_API_KEY: "test-secret" });

    const response = await handler(createRequest(validPayload));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "The contact email service is not configured.",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns an error when Resend rejects the request or does not confirm an id", async () => {
    const config = {
      RESEND_API_KEY: "test-secret",
      CONTACT_TO_EMAIL: "private-inbox@example.com",
      CONTACT_FROM_EMAIL: "EXAMPRO <verified@example.org>",
    };
    const rejected = createHandler(
      vi.fn(async () => new Response(JSON.stringify({ message: "rejected" }), { status: 403 })),
      config,
    );
    const unconfirmed = createHandler(
      vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
      config,
    );

    expect((await rejected(createRequest(validPayload))).status).toBe(502);
    const response = await unconfirmed(createRequest(validPayload));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "The contact email service did not confirm the message.",
    });
  });

  it("enforces the public origin allowlist and handles preflight requests", async () => {
    const handler = createHandler();
    const blocked = await handler(
      createRequest(validPayload, {
        headers: { Origin: "https://untrusted.example" },
      }),
    );
    const preflight = await handler(
      new Request("https://supabase.example/functions/v1/contact", {
        method: "OPTIONS",
        headers: { Origin: allowedOrigin },
      }),
    );

    expect(blocked.status).toBe(403);
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
  });
});
