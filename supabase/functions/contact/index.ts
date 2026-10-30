import { createContactHandler } from "./handler.ts";

Deno.serve(
  createContactHandler({
    env: { get: (name) => Deno.env.get(name) },
  }),
);
