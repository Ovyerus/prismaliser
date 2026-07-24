import { expect, it } from "vitest";

import { readFileSync } from "node:fs";

import {
  PENDING_SHARE_KEY,
  PRISMALISER_OAUTH_SCOPE,
} from "~/atproto/constants";
import {
  fetchAndValidateClientMetadata,
  hasOAuthCallback,
  savePendingShare,
  takePendingShare,
  validateClientMetadataDocument,
} from "~/atproto/oauth";
import type { ShareStorage } from "~/atproto/oauth";

const hostedMetadata = JSON.parse(
  readFileSync(
    new URL("../../public/oauth-client-metadata.json", import.meta.url),
    "utf8",
  ),
) as { scope?: string };
const caddyfile = readFileSync(
  new URL("../../Caddyfile", import.meta.url),
  "utf8",
);
const caddyScope = caddyfile.match(/"scope":"([^"]*)"/)?.[1];
const viteConfig = readFileSync(
  new URL("../../vite.config.ts", import.meta.url),
  "utf8",
);

const createStorage = () => {
  const values = new Map<string, string>();
  const storage: ShareStorage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };

  return { storage, values };
};

const validMetadata = {
  client_id: "https://example.com/oauth-client-metadata.json",
  redirect_uris: ["https://example.com/"],
  scope: PRISMALISER_OAUTH_SCOPE,
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  application_type: "web",
  token_endpoint_auth_method: "none",
  dpop_bound_access_tokens: true,
};

it("requires the direct schema blob scope in deployed metadata", () => {
  expect(PRISMALISER_OAUTH_SCOPE).toBe(
    "atproto repo:app.prismaliser.schema?action=create&action=delete blob?accept=text/plain",
  );
  expect(hostedMetadata.scope).toBe(PRISMALISER_OAUTH_SCOPE);
  expect(caddyScope).toBe(PRISMALISER_OAUTH_SCOPE);
});

it("uses the shared exact scope in the development OAuth client ID", () => {
  expect(viteConfig).toContain("encodeURIComponent(PRISMALISER_OAUTH_SCOPE)");
});

it("requires same-origin metadata and exact OAuth values", () => {
  expect(
    validateClientMetadataDocument("https://example.com", validMetadata),
  ).toBe(true);
  expect(
    validateClientMetadataDocument("https://example.com", {
      ...validMetadata,
      client_id: "https://attacker.example/oauth-client-metadata.json",
    }),
  ).toBe(false);
  expect(
    validateClientMetadataDocument("https://example.com", {
      ...validMetadata,
      redirect_uris: ["https://attacker.example/"],
    }),
  ).toBe(false);
  expect(
    validateClientMetadataDocument("https://example.com", {
      ...validMetadata,
      scope: `${PRISMALISER_OAUTH_SCOPE} transition:generic`,
    }),
  ).toBe(false);
  expect(
    validateClientMetadataDocument("https://example.com", {
      ...validMetadata,
      grant_types: ["authorization_code"],
    }),
  ).toBe(false);
  expect(
    validateClientMetadataDocument("https://example.com", {
      ...validMetadata,
      response_types: ["token"],
    }),
  ).toBe(false);
  expect(
    validateClientMetadataDocument("https://example.com", {
      ...validMetadata,
      application_type: "native",
    }),
  ).toBe(false);
  expect(
    validateClientMetadataDocument("https://example.com", {
      ...validMetadata,
      token_endpoint_auth_method: "client_secret_basic",
    }),
  ).toBe(false);
  expect(
    validateClientMetadataDocument("https://example.com", {
      ...validMetadata,
      dpop_bound_access_tokens: false,
    }),
  ).toBe(false);
});

it("rejects plain HTTP production metadata", () => {
  expect(
    validateClientMetadataDocument("http://example.com", {
      ...validMetadata,
      client_id: "http://example.com/oauth-client-metadata.json",
      redirect_uris: ["http://example.com/"],
    }),
  ).toBe(false);
});

it("accepts optional hosted metadata only when its client URI is same-origin", () => {
  expect(
    validateClientMetadataDocument("https://example.com", {
      ...validMetadata,
      client_name: "Prismaliser",
      client_uri: "https://example.com",
    }),
  ).toBe(true);
  expect(
    validateClientMetadataDocument("https://example.com", {
      ...validMetadata,
      client_uri: "https://attacker.example",
    }),
  ).toBe(false);
});

it("rejects non-object metadata and invalid deployment origins", () => {
  expect(validateClientMetadataDocument("https://example.com", null)).toBe(
    false,
  );
  expect(validateClientMetadataDocument("not an origin", validMetadata)).toBe(
    false,
  );
});

it("fetches and validates deployment metadata without throwing", async () => {
  const requests: string[] = [];
  const validFetcher: typeof fetch = (input) => {
    requests.push(String(input));
    return Promise.resolve(
      new Response(JSON.stringify(validMetadata), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
  };

  await expect(
    fetchAndValidateClientMetadata("https://example.com", validFetcher),
  ).resolves.toBe(true);
  expect(requests).toEqual(["https://example.com/oauth-client-metadata.json"]);

  const missingFetcher: typeof fetch = () =>
    Promise.resolve(new Response("missing", { status: 404 }));
  await expect(
    fetchAndValidateClientMetadata("https://example.com", missingFetcher),
  ).resolves.toBe(false);

  const malformedFetcher: typeof fetch = () =>
    Promise.resolve(
      new Response("{", {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
  await expect(
    fetchAndValidateClientMetadata("https://example.com", malformedFetcher),
  ).resolves.toBe(false);
});

it("recognises only complete OAuth callback fragments", () => {
  expect(
    hasOAuthCallback("#code=abc&state=def&iss=https%3A%2F%2Fpds.example"),
  ).toBe(true);
  expect(hasOAuthCallback("#error=access_denied&state=def")).toBe(true);
  expect(hasOAuthCallback("#code=abc")).toBe(false);
  expect(hasOAuthCallback("#code=abc&state=def")).toBe(false);
  expect(hasOAuthCallback("#error=access_denied")).toBe(false);
  expect(hasOAuthCallback("#state=def&iss=https%3A%2F%2Fpds.example")).toBe(
    false,
  );
});

it("takes a pending share once", () => {
  const { storage, values } = createStorage();
  savePendingShare(
    { schema: "model A { id Int @id }", positions: [] },
    1_000,
    storage,
  );

  expect(values.has(PENDING_SHARE_KEY)).toBe(true);
  expect(takePendingShare(1_001, storage)?.schema).toContain("model A");
  expect(values.has(PENDING_SHARE_KEY)).toBe(false);
  expect(takePendingShare(1_002, storage)).toBeNull();
});

it("expires pending shares after fifteen minutes", () => {
  const { storage, values } = createStorage();
  savePendingShare(
    { schema: "model A { id Int @id }", positions: [] },
    1_000,
    storage,
  );

  expect(takePendingShare(901_000, storage)).toBeNull();
  expect(values.has(PENDING_SHARE_KEY)).toBe(false);
});

it("removes malformed pending share data without exposing it", () => {
  const { storage, values } = createStorage();
  values.set(PENDING_SHARE_KEY, "not-json");

  expect(takePendingShare(1_000, storage)).toBeNull();
  expect(values.has(PENDING_SHARE_KEY)).toBe(false);
});
