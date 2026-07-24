# AT Protocol Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-only AT Protocol login, immutable schema-and-layout
publication, public shared-record loading, legacy anonymous links, and owner
share management to Prismaliser.

**Architecture:** Browser OAuth and repository writes use the pinned atcute
packages directly against the user's PDS. Public links resolve standard
`com.atproto.repo.getRecord` through Slingshot first and the author's current
PDS second; validated records are parsed and committed to the workspace
transactionally. `App` coordinates session and snapshot state, while `FlowView`
retains ownership of high-frequency React Flow state behind a narrow position
snapshot interface.

**Tech Stack:** React 19, TypeScript 5.9 strict mode, Vite 8, Vitest 4, React
Flow 11, Tailwind 4, Prisma schema WASM, atcute OAuth/client/identity/Lexicon
packages, Caddy.

## Global Constraints

- Keep Prismaliser a static SPA: no Prismaliser account database, backend OAuth
  client, token proxy, record proxy, relay consumer, or appview.
- Use exact versions `@atcute/oauth-browser-client@4.0.1`,
  `@atcute/client@5.1.1`, `@atcute/identity-resolver@2.0.1`,
  `@atcute/atproto@4.0.3`, `@atcute/lexicons@2.0.3`, and
  `@atcute/lex-cli@3.2.1`; review upstream before changing these pins.
- Request exactly
  `atproto repo:app.prismaliser.schema?action=create&action=delete`; never fall
  back to `transition:generic`.
- Use collection `app.prismaliser.schema`, `tid` record keys, immutable
  create/delete semantics, and no `putRecord` path.
- Preserve reading and secondary creation of current `?code=` schema-only links.
- Canonical AT links use `/?at=<percent-encoded canonical at-uri>` and work
  without route rewrites.
- Public reads use Slingshot first and direct DID-to-PDS resolution second;
  validate every response before Prisma WASM sees it.
- Keep full Monaco bundling unchanged and do not introduce a state-management
  library.
- Internal imports use `~/*`; components remain arrow functions with default
  exports and exported `*Props` interfaces.
- Use native `<dialog>` and `<details>/<summary>` semantics, explicit text for
  state, sorted JSX props, and explicit icon width and height.
- Use Tailwind 4 only; CSS modules using Tailwind features start with
  `@reference "tailwindcss";`.
- Run commands through `nix develop --command` on this workstation; dependency
  changes set `YARN_ENABLE_IMMUTABLE_INSTALLS=false`.
- Start every dev server, preview server, and Docker container through the Hub
  process tool; never launch a long-running process through Bash.
- Use Jujutsu commits (`jj commit -m ...`), not staging commands.

## File Structure

### New protocol files

- `lexicons/app/prismaliser/schema.json` — canonical record Lexicon source.
- `lex.config.ts` — atcute Lexicon generation configuration.
- `src/lexicons/types/app/prismaliser/schema.ts` — generated record schema and
  TypeScript types; never hand-edit.
- `src/atproto/constants.ts` — collection, scope, Slingshot URL, pending-share
  key, and Prisma version constants.
- `src/atproto/types.ts` — session, draft, loaded snapshot, manager page, and
  typed error contracts.
- `src/atproto/record.ts` — record creation, runtime validation, byte bounds,
  duplicate detection, and labels.
- `src/atproto/record.test.ts` — record boundary contracts.
- `src/atproto/links.ts` — AT/legacy URL creation and startup query parsing.
- `src/atproto/links.test.ts` — URL compatibility and ambiguity contracts.
- `src/atproto/identity.ts` — shared atcute actor resolver configured with
  Slingshot, PLC, and Web DID resolution.
- `src/atproto/publicRecords.ts` — Slingshot-first/direct-PDS record retrieval
  and read-error mapping.
- `src/atproto/publicRecords.test.ts` — fallback-order and error-category
  contracts.
- `src/atproto/oauth.ts` — atcute configuration, metadata validation,
  authorisation, callback, resume, and disconnect.
- `src/atproto/oauth.test.ts` — pure metadata, callback-detection, and
  pending-draft contracts.
- `src/atproto/repository.ts` — authenticated create/list/delete operations and
  transport boundary.
- `src/atproto/repository.test.ts` — immutable mutation and pagination
  contracts.
- `src/util/nodePositions.ts` — position capture, application, normalisation,
  and equality.
- `src/util/nodePositions.test.ts` — graph snapshot contracts.
- `src/util/analytics.ts` — privacy decision for Umami injection.
- `src/util/analytics.test.ts` — callback and legacy-link analytics exclusions.

### New UI files

- `src/components/Dialog.tsx` and `src/components/Dialog.module.css` —
  accessible shared native-dialog wrapper.
- `src/components/ConnectDialog.tsx` — approved account connection copy and
  actions.
- `src/components/AccountMenu.tsx` — connected identity, My shares, and
  Disconnect.
- `src/components/ShareDialog.tsx` — publish form, public warning, and
  legacy-link action.
- `src/components/SharesDialog.tsx` — paginated manager with
  search/open/copy/delete.
- `src/components/SnapshotBar.tsx` — attribution, modified/deleted state, and
  original-link copy.
- `src/components/Sharing.module.css` — shared dialog/menu/attribution
  presentation that cannot be expressed cleanly as inline utilities.

### Existing files changed

- `package.json`, `yarn.lock` — pinned atcute packages and Lexicon scripts.
- `.github/workflows/push.yaml` — generated-Lexicon drift check.
- `src/util/types.ts` — serialisable `NodePosition` contract.
- `src/components/FlowView.tsx` — position seed, snapshot handle, and dirty
  callback.
- `src/components/Nav.tsx` — connection entry/account menu.
- `src/components/Layout.tsx` — nav props.
- `src/components/CopyButton.tsx` — replaced by the Share entry component and
  then removed.
- `src/App.tsx` — ordered bootstrap, session orchestration, transactional share
  loading, dialogs, and snapshot baseline.
- `src/main.tsx` — analytics privacy gate.
- `vite.config.ts` — deterministic localhost OAuth client metadata values.
- `public/oauth-client-metadata.json` — hosted production metadata.
- `Caddyfile` — origin-specific Docker metadata.
- `README.md` — self-host OAuth configuration and sharing behaviour.

---

### Task 1: Pin atcute and establish the Lexicon source pipeline

**Files:**

- Modify: `package.json`
- Modify: `yarn.lock`
- Create: `lex.config.ts`
- Create: `lexicons/app/prismaliser/schema.json`
- Generate: `src/lexicons/types/app/prismaliser/schema.ts`
- Modify: `.github/workflows/push.yaml:15-25`

**Interfaces:**

- Produces: `AppPrismaliserSchema.mainSchema` and `AppPrismaliserSchema.Main`
  from `~/lexicons/types/app/prismaliser/schema`.
- Produces scripts: `yarn lex:generate` and `yarn lex:check`.

- [ ] **Step 1: Install exact runtime and development packages**

Run:

```bash
YARN_ENABLE_IMMUTABLE_INSTALLS=false nix develop --command yarn add --exact \
  @atcute/oauth-browser-client@4.0.1 \
  @atcute/client@5.1.1 \
  @atcute/identity-resolver@2.0.1 \
  @atcute/atproto@4.0.3 \
  @atcute/lexicons@2.0.3
YARN_ENABLE_IMMUTABLE_INSTALLS=false nix develop --command yarn add --dev --exact \
  @atcute/lex-cli@3.2.1
```

Expected: `package.json` has exact versions without `^`/`~`; `yarn.lock`
resolves all packages.

- [ ] **Step 2: Add generator scripts and config**

Add these scripts to `package.json`:

```json
{
  "lex:generate": "lex-cli generate",
  "lex:check": "lex-cli generate && git diff --exit-code -- src/lexicons"
}
```

Create `lex.config.ts`:

```ts
import { defineLexiconConfig } from "@atcute/lex-cli";

export default defineLexiconConfig({
  generate: {
    files: ["lexicons/**/*.json"],
    outdir: "src/lexicons/",
  },
});
```

- [ ] **Step 3: Add the canonical record Lexicon**

Create `lexicons/app/prismaliser/schema.json`:

```json
{
  "lexicon": 1,
  "id": "app.prismaliser.schema",
  "defs": {
    "main": {
      "type": "record",
      "description": "An immutable Prismaliser Prisma schema and graph layout snapshot.",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["schema", "positions", "prismaVersion", "createdAt"],
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 160,
            "maxGraphemes": 80
          },
          "schema": {
            "type": "string",
            "maxLength": 500000
          },
          "positions": {
            "type": "array",
            "maxLength": 5000,
            "items": {
              "type": "ref",
              "ref": "#position"
            }
          },
          "prismaVersion": {
            "type": "string",
            "maxLength": 64
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    },
    "position": {
      "type": "object",
      "required": ["id", "x", "y"],
      "properties": {
        "id": {
          "type": "string",
          "maxLength": 512
        },
        "x": {
          "type": "integer",
          "minimum": -10000000,
          "maximum": 10000000
        },
        "y": {
          "type": "integer",
          "minimum": -10000000,
          "maximum": 10000000
        }
      }
    }
  }
}
```

- [ ] **Step 4: Generate bindings and inspect only generated exports**

Run:

```bash
nix develop --command yarn lex:generate
nix develop --command yarn prettier --write \
  lex.config.ts lexicons/app/prismaliser/schema.json
nix develop --command yarn build
```

Expected: generation creates `src/lexicons/types/app/prismaliser/schema.ts`;
build passes. Do not edit generated output to fix errors—fix JSON or config and
regenerate.

- [ ] **Step 5: Enforce generated-source drift in CI**

Insert after `yarn install` in `.github/workflows/push.yaml`:

```yaml
- name: generated lexicons are current
  run: nix develop --command yarn lex:check
```

Run:

```bash
nix develop --command yarn lex:check
```

Expected: exit 0 and no generated diff.

- [ ] **Step 6: Commit**

```bash
jj commit -m "feat: add Prismaliser sharing lexicon"
```

---

### Task 2: Implement record and link domain contracts

**Files:**

- Create: `src/atproto/constants.ts`
- Create: `src/atproto/types.ts`
- Create: `src/atproto/record.ts`
- Create: `src/atproto/record.test.ts`
- Create: `src/atproto/links.ts`
- Create: `src/atproto/links.test.ts`
- Modify: `src/util/types.ts`

**Interfaces:**

- Produces: `NodePosition`, `SnapshotDraft`, `LoadedSnapshot`, `ShareLocation`.
- Produces: `createShareRecord`, `parseShareRecord`, `deriveSnapshotLabel`,
  `normalisePositions`.
- Produces: `parseShareLocation`, `createAtShareUrl`, `createLegacyShareUrl`,
  `parsePrismaliserAtUri`.

- [ ] **Step 1: Add failing tests for record boundaries**

Create `src/atproto/record.test.ts` with these observable cases:

```ts
import { describe, expect, it } from "vitest";

import {
  createShareRecord,
  parseShareRecord,
  ShareRecordValidationError,
} from "~/atproto/record";

const valid = {
  $type: "app.prismaliser.schema",
  schema: "model User { id Int @id }",
  positions: [{ id: "User", x: 12, y: -8 }],
  prismaVersion: "7.9.0",
  createdAt: "2026-07-24T12:00:00.000Z",
};

describe("Prismaliser share records", () => {
  it("rounds and deterministically sorts positions for publication", () => {
    expect(
      createShareRecord({
        schema: valid.schema,
        positions: [
          { id: "Z", x: 1.8, y: 2.2 },
          { id: "A", x: -1.5, y: 0.4 },
        ],
        createdAt: new Date(valid.createdAt),
      }).positions,
    ).toEqual([
      { id: "A", x: -1, y: 0 },
      { id: "Z", x: 2, y: 2 },
    ]);
  });

  it("accepts additive unknown fields", () => {
    expect(parseShareRecord({ ...valid, future: true }).schema).toBe(
      valid.schema,
    );
  });

  it("rejects duplicate position IDs", () => {
    expect(() =>
      parseShareRecord({
        ...valid,
        positions: [valid.positions[0]!, valid.positions[0]!],
      }),
    ).toThrow(ShareRecordValidationError);
  });

  it("counts schema limits as UTF-8 bytes", () => {
    expect(() =>
      parseShareRecord({ ...valid, schema: "é".repeat(250_001) }),
    ).toThrow(ShareRecordValidationError);
  });

  it("rejects records over the total serialised ceiling", () => {
    const positions = Array.from({ length: 5_000 }, (_, index) => ({
      id: `${index}-${"x".repeat(500)}`,
      x: index,
      y: index,
    }));
    expect(() => parseShareRecord({ ...valid, positions })).toThrow(
      ShareRecordValidationError,
    );
  });
});
```

Run:

```bash
nix develop --command yarn test src/atproto/record.test.ts
```

Expected: FAIL because `~/atproto/record` does not exist.

- [ ] **Step 2: Define shared types and constants**

Append to `src/util/types.ts`:

```ts
export interface NodePosition {
  id: string;
  x: number;
  y: number;
}
```

Create `src/atproto/constants.ts`:

```ts
export const PRISMALISER_COLLECTION = "app.prismaliser.schema" as const;
export const PRISMALISER_OAUTH_SCOPE =
  "atproto repo:app.prismaliser.schema?action=create&action=delete";
export const PRISMA_SCHEMA_VERSION = "7.9.0";
export const SLINGSHOT_ORIGIN = "https://slingshot.microcosm.blue";
export const PENDING_SHARE_KEY = "prismaliser.atproto.pending-share";
export const ACTIVE_DID_KEY = "prismaliser.atproto.active-did";
export const MAX_RECORD_BYTES = 750_000;
```

Create `src/atproto/types.ts` with exact public contracts:

```ts
import type { Client } from "@atcute/client";
import type { OAuthUserAgent } from "@atcute/oauth-browser-client";

import type { NodePosition } from "~/util/types";

export interface SnapshotDraft {
  name?: string;
  schema: string;
  positions: NodePosition[];
}

export interface ConnectedSession {
  did: string;
  handle?: string;
  agent: OAuthUserAgent;
  client: Client;
}

export interface LoadedSnapshot {
  uri: string;
  cid: string;
  name?: string;
  schema: string;
  positions: NodePosition[];
  prismaVersion: string;
  createdAt: string;
  authorDid: string;
  authorHandle?: string;
}

export interface SnapshotSummary {
  uri: string;
  cid: string;
  name?: string;
  label: string;
  createdAt: string;
  nodeIds: string[];
}

export interface SnapshotPage {
  snapshots: SnapshotSummary[];
  cursor?: string;
  invalidCount: number;
}

export type ShareLocation =
  | { kind: "local" }
  | { kind: "legacy"; schema: string }
  | { kind: "at"; uri: string }
  | { kind: "invalid"; reason: string };
```

- [ ] **Step 3: Implement record construction and validation**

Create `src/atproto/record.ts` with these exports and rules:

```ts
import { safeParse } from "@atcute/lexicons";

import { MAX_RECORD_BYTES, PRISMA_SCHEMA_VERSION } from "~/atproto/constants";
import * as AppPrismaliserSchema from "~/lexicons/types/app/prismaliser/schema";

import type { SnapshotDraft } from "~/atproto/types";
import type { NodePosition } from "~/util/types";

export class ShareRecordValidationError extends Error {
  public constructor(readonly reason: string) {
    super(reason);
    this.name = "ShareRecordValidationError";
  }
}

const encodedBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;

export const normalisePositions = (positions: readonly NodePosition[]) =>
  positions
    .map(({ id, x, y }) => ({ id, x: Math.round(x), y: Math.round(y) }))
    .sort((left, right) => left.id.localeCompare(right.id));

export const parseShareRecord = (value: unknown) => {
  const result = safeParse(AppPrismaliserSchema.mainSchema, value);
  if (!result.ok) throw new ShareRecordValidationError(result.message);
  if (encodedBytes(value) > MAX_RECORD_BYTES)
    throw new ShareRecordValidationError(
      "Record exceeds Prismaliser's size limit",
    );

  const ids = new Set<string>();
  for (const position of result.value.positions) {
    if (ids.has(position.id))
      throw new ShareRecordValidationError(
        `Duplicate node position: ${position.id}`,
      );
    ids.add(position.id);
  }

  return result.value;
};

export const createShareRecord = ({
  name,
  schema,
  positions,
  createdAt = new Date(),
}: SnapshotDraft & { createdAt?: Date }) =>
  parseShareRecord({
    $type: "app.prismaliser.schema",
    ...(name?.trim() ? { name: name.trim() } : {}),
    schema,
    positions: normalisePositions(positions),
    prismaVersion: PRISMA_SCHEMA_VERSION,
    createdAt: createdAt.toISOString(),
  });

export const deriveSnapshotLabel = (
  name: string | undefined,
  positions: readonly NodePosition[],
) =>
  name?.trim() ||
  positions
    .map(({ id }) => id)
    .filter((id) => !id.startsWith("_"))
    .slice(0, 3)
    .join(", ") ||
  "Untitled diagram";
```

Run the record test. Expected: PASS.

- [ ] **Step 4: Add failing link compatibility tests**

Create `src/atproto/links.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  createAtShareUrl,
  createLegacyShareUrl,
  parseShareLocation,
} from "~/atproto/links";

const uri =
  "at://did:plc:hdhoaan3xa3jiuq4fg4mefid/app.prismaliser.schema/3lv4ouczo2b2a";

describe("share links", () => {
  it("round-trips canonical AT links", () => {
    const url = new URL(createAtShareUrl(uri, "https://prismaliser.app"));
    expect(parseShareLocation(url.search)).toEqual({ kind: "at", uri });
  });

  it("keeps schema-only link creation compatible", () => {
    const schema = "model User { id Int @id }";
    const url = new URL(
      createLegacyShareUrl(schema, "https://prismaliser.app"),
    );
    expect(parseShareLocation(url.search)).toEqual({ kind: "legacy", schema });
  });

  it("rejects ambiguous and duplicate parameters", () => {
    expect(
      parseShareLocation(`?at=${encodeURIComponent(uri)}&code=abc`).kind,
    ).toBe("invalid");
    expect(
      parseShareLocation(
        `?at=${encodeURIComponent(uri)}&at=${encodeURIComponent(uri)}`,
      ).kind,
    ).toBe("invalid");
  });

  it("rejects another collection", () => {
    expect(
      parseShareLocation(
        "?at=" +
          encodeURIComponent(
            "at://did:plc:hdhoaan3xa3jiuq4fg4mefid/app.bsky.feed.post/3lv4ouczo2b2a",
          ),
      ).kind,
    ).toBe("invalid");
  });
});
```

Run the test. Expected: FAIL because `~/atproto/links` does not exist.

- [ ] **Step 5: Implement link parsing and creation**

Create `src/atproto/links.ts` using `parseCanonicalResourceUri` from
`@atcute/lexicons/syntax`, existing `toUrlSafeB64`/`fromUrlSafeB64`, and these
rules:

```ts
import { parseCanonicalResourceUri } from "@atcute/lexicons/syntax";

import { PRISMALISER_COLLECTION } from "~/atproto/constants";
import { fromUrlSafeB64, toUrlSafeB64 } from "~/util";

import type { ShareLocation } from "~/atproto/types";

export const parsePrismaliserAtUri = (value: string) => {
  const parsed = parseCanonicalResourceUri(value);
  if (parsed.collection !== PRISMALISER_COLLECTION || !parsed.rkey)
    throw new SyntaxError("Not a Prismaliser snapshot URI");
  return parsed;
};

export const parseShareLocation = (search: string): ShareLocation => {
  const params = new URLSearchParams(search);
  const at = params.getAll("at");
  const code = params.getAll("code");
  if (at.length + code.length === 0) return { kind: "local" };
  if (at.length !== 1 || code.length !== 0) {
    if (code.length === 1 && at.length === 0) {
      try {
        return { kind: "legacy", schema: fromUrlSafeB64(code[0]!) };
      } catch {
        return { kind: "invalid", reason: "Invalid schema-only link" };
      }
    }
    return { kind: "invalid", reason: "Ambiguous share link" };
  }
  try {
    parsePrismaliserAtUri(at[0]!);
    return { kind: "at", uri: at[0]! };
  } catch {
    return { kind: "invalid", reason: "Invalid Prismaliser record link" };
  }
};

export const createAtShareUrl = (uri: string, origin = location.origin) => {
  parsePrismaliserAtUri(uri);
  return `${origin}/?${new URLSearchParams({ at: uri }).toString()}`;
};

export const createLegacyShareUrl = (
  schema: string,
  origin = location.origin,
) =>
  `${origin}/?${new URLSearchParams({ code: toUrlSafeB64(schema) }).toString()}`;
```

Run:

```bash
nix develop --command yarn test src/atproto/record.test.ts src/atproto/links.test.ts
nix develop --command yarn lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
jj commit -m "feat: add AT Protocol share contracts"
```

---

### Task 3: Implement Slingshot-first public record loading

**Files:**

- Create: `src/atproto/identity.ts`
- Create: `src/atproto/publicRecords.ts`
- Create: `src/atproto/publicRecords.test.ts`

**Interfaces:**

- Consumes: `parsePrismaliserAtUri`, `parseShareRecord`, `SLINGSHOT_ORIGIN`.
- Produces: `loadPublicRecord(uri, options): Promise<LoadedSnapshot>`.
- Produces: `PublicRecordLoadError` with codes `not-found`, `unreachable`,
  `pds-cors`, `invalid-record`.

- [ ] **Step 1: Write failing fallback-order tests**

Use injected dependencies so tests never access the network:

```ts
import { describe, expect, it, vi } from "vitest";

import {
  loadPublicRecord,
  PublicRecordLoadError,
} from "~/atproto/publicRecords";

const uri =
  "at://did:plc:hdhoaan3xa3jiuq4fg4mefid/app.prismaliser.schema/3lv4ouczo2b2a";
const envelope = {
  uri,
  cid: "bafyreialv3mzvvxaoyrfrwoer3xmabbmdchvrbyhayd7bga47qjbycy74e",
  value: {
    $type: "app.prismaliser.schema",
    schema: "model User { id Int @id }",
    positions: [{ id: "User", x: 1, y: 2 }],
    prismaVersion: "7.9.0",
    createdAt: "2026-07-24T12:00:00.000Z",
  },
};

describe("public record loading", () => {
  it("uses Slingshot without resolving the PDS on success", async () => {
    const direct = vi.fn();
    const loaded = await loadPublicRecord(uri, {
      slingshot: vi.fn().mockResolvedValue(envelope),
      direct,
      resolveActor: vi.fn(),
    });
    expect(loaded.schema).toContain("model User");
    expect(direct).not.toHaveBeenCalled();
  });

  it("falls back to the resolved PDS after Slingshot failure", async () => {
    const direct = vi.fn().mockResolvedValue(envelope);
    await loadPublicRecord(uri, {
      slingshot: vi.fn().mockRejectedValue(new TypeError("offline")),
      direct,
      resolveActor: vi.fn().mockResolvedValue({
        did: "did:plc:hdhoaan3xa3jiuq4fg4mefid",
        handle: "alice.example",
        pds: "https://pds.example",
      }),
    });
    expect(direct).toHaveBeenCalledWith("https://pds.example", uri, undefined);
  });

  it("maps two definitive misses to not-found", async () => {
    await expect(
      loadPublicRecord(uri, {
        slingshot: vi
          .fn()
          .mockRejectedValue(new PublicRecordLoadError("not-found")),
        direct: vi
          .fn()
          .mockRejectedValue(new PublicRecordLoadError("not-found")),
        resolveActor: vi.fn().mockResolvedValue({
          did: "did:plc:hdhoaan3xa3jiuq4fg4mefid",
          handle: "alice.example",
          pds: "https://pds.example",
        }),
      }),
    ).rejects.toMatchObject({ code: "not-found" });
  });
});
```

Run the test. Expected: FAIL because the module does not exist.

- [ ] **Step 2: Configure the shared identity resolver**

Create `src/atproto/identity.ts`:

```ts
import {
  CompositeDidDocumentResolver,
  LocalActorResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
  XrpcHandleResolver,
} from "@atcute/identity-resolver";

import { SLINGSHOT_ORIGIN } from "~/atproto/constants";

export const actorResolver = new LocalActorResolver({
  handleResolver: new XrpcHandleResolver({ serviceUrl: SLINGSHOT_ORIGIN }),
  didDocumentResolver: new CompositeDidDocumentResolver({
    methods: {
      plc: new PlcDidDocumentResolver(),
      web: new WebDidDocumentResolver(),
    },
  }),
});
```

- [ ] **Step 3: Implement the standard getRecord transport and fallback**

Create `src/atproto/publicRecords.ts`. Register standard definitions with
`import type {} from "@atcute/atproto";`, use `Client` + `simpleFetchHandler`,
and expose injectable dependencies:

```ts
export interface PublicRecordDependencies {
  slingshot(
    uri: string,
    signal?: AbortSignal,
  ): Promise<{ uri: string; cid: string; value: unknown }>;
  direct(
    pds: string,
    uri: string,
    signal?: AbortSignal,
  ): Promise<{ uri: string; cid: string; value: unknown }>;
  resolveActor: typeof actorResolver.resolve;
}

export class PublicRecordLoadError extends Error {
  public constructor(
    readonly code: "not-found" | "unreachable" | "pds-cors" | "invalid-record",
    message = code,
  ) {
    super(message);
    this.name = "PublicRecordLoadError";
  }
}
```

The concrete request function must call:

```ts
client.get("com.atproto.repo.getRecord", {
  params: {
    repo: parsed.repo,
    collection: parsed.collection,
    rkey: parsed.rkey,
  },
  signal,
});
```

Map `RecordNotFound` to `not-found`, non-OK XRPC responses to `unreachable`, and
fetch `TypeError` from the direct request to `pds-cors` only after Slingshot has
already failed. Validate `response.data.value` with `parseShareRecord` and
return author DID/verified handle in `LoadedSnapshot`.

- [ ] **Step 4: Run focused and full protocol tests**

```bash
nix develop --command yarn test src/atproto/publicRecords.test.ts
nix develop --command yarn test src/atproto
nix develop --command yarn lint
```

Expected: PASS; no live network request appears in Vitest output.

- [ ] **Step 5: Commit**

```bash
jj commit -m "feat: load public AT Protocol snapshots"
```

---

### Task 4: Add OAuth bootstrap, pending-share persistence, and analytics privacy

**Files:**

- Create: `src/atproto/oauth.ts`
- Create: `src/atproto/oauth.test.ts`
- Create: `src/util/analytics.ts`
- Create: `src/util/analytics.test.ts`
- Modify: `src/main.tsx:13-23`
- Modify: `vite.config.ts:1-18`

**Interfaces:**

- Consumes: `actorResolver`, `ConnectedSession`, `SnapshotDraft`, AT constants.
- Produces: `configureBrowserOAuth`, `validateClientMetadataDocument`,
  `fetchAndValidateClientMetadata`, `beginAccountAuthorization`,
  `beginBlueskyAuthorization`, `finalizeBrowserOAuth`, `resumeBrowserSession`,
  `disconnectBrowserSession`.
- Produces: `savePendingShare`, `takePendingShare`, `hasOAuthCallback`.
- Produces: `shouldLoadAnalytics(url)`.

- [ ] **Step 1: Write failing pure OAuth and analytics tests**

Cover exact metadata equality, callback recognition, one-shot pending draft
consumption, expiry, and analytics exclusion:

```ts
import { expect, it } from "vitest";

import {
  hasOAuthCallback,
  savePendingShare,
  takePendingShare,
  validateClientMetadataDocument,
} from "~/atproto/oauth";

it("requires same-origin metadata and exact scope", () => {
  expect(
    validateClientMetadataDocument("https://example.com", {
      client_id: "https://example.com/oauth-client-metadata.json",
      redirect_uris: ["https://example.com/"],
      scope: "atproto repo:app.prismaliser.schema?action=create&action=delete",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    }),
  ).toBe(true);
});

it("recognises only complete OAuth callback fragments", () => {
  expect(
    hasOAuthCallback("#code=abc&state=def&iss=https%3A%2F%2Fpds.example"),
  ).toBe(true);
  expect(hasOAuthCallback("#code=abc")).toBe(false);
});

it("takes a pending share once", () => {
  const values = new Map<string, string>();
  const storage: Pick<Storage, "getItem" | "removeItem" | "setItem"> = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
  savePendingShare(
    { schema: "model A { id Int @id }", positions: [] },
    1_000,
    storage,
  );
  expect(takePendingShare(1_001, storage)?.schema).toContain("model A");
  expect(takePendingShare(1_002, storage)).toBeNull();
});
```

Create `src/util/analytics.test.ts` with:

```ts
import { expect, it } from "vitest";

import { shouldLoadAnalytics } from "~/util/analytics";

it("keeps sensitive callback and inline-schema URLs out of analytics", () => {
  expect(
    shouldLoadAnalytics(
      new URL(
        "https://example.com/#code=a&state=b&iss=https%3A%2F%2Fpds.example",
      ),
    ),
  ).toBe(false);
  expect(
    shouldLoadAnalytics(new URL("https://example.com/?code=c2NoZW1h")),
  ).toBe(false);
  expect(
    shouldLoadAnalytics(
      new URL(
        "https://example.com/?at=at%3A%2F%2Fdid%3Aplc%3Ax%2Fapp.prismaliser.schema%2Fy",
      ),
    ),
  ).toBe(true);
});
```

Run both tests. Expected: FAIL because modules do not exist.

- [ ] **Step 2: Implement OAuth configuration and session operations**

Configure once with:

```ts
configureOAuth({
  metadata: {
    client_id: clientId,
    redirect_uri: redirectUri,
  },
  identityResolver: actorResolver,
});
```

Production values are `${location.origin}/oauth-client-metadata.json` and
`${location.origin}/`. Development values come from Vite-injected
`VITE_OAUTH_CLIENT_ID` and `VITE_OAUTH_REDIRECT_URI`.

Account authorisation calls:

```ts
createAuthorizationUrl({
  target: { type: "account", identifier: handle },
  scope: PRISMALISER_OAUTH_SCOPE,
});
```

The Bluesky shortcut calls:

```ts
createAuthorizationUrl({
  target: { type: "pds", serviceUrl: "https://bsky.social" },
  scope: PRISMALISER_OAUTH_SCOPE,
});
```

After the atcute-recommended short persistence delay, assign the returned URL.
Callback finalisation uses `finalizeAuthorization`, creates `OAuthUserAgent` and
`Client`, stores only the returned DID under `ACTIVE_DID_KEY`, resolves its
display handle, and scrubs the hash with `history.replaceState` before
returning.

Session resume uses `getSession(did, { allowStale: true })`. Disconnect calls
`agent.signOut()`, falling back to `deleteStoredSession(did)`, then removes
`ACTIVE_DID_KEY`.

Pending share storage envelope:

```ts
interface PendingShareEnvelope {
  expiresAt: number;
  draft: SnapshotDraft;
}
```

```ts
export type ShareStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export declare const savePendingShare: (
  draft: SnapshotDraft,
  now?: number,
  storage?: ShareStorage,
) => void;

export declare const takePendingShare: (
  now?: number,
  storage?: ShareStorage,
) => SnapshotDraft | null;
```

Use a 15-minute lifetime, remove on every successful/expired read, and never
store it in `localStorage`.

- [ ] **Step 3: Add deterministic localhost OAuth values to Vite**

Extend `vite.config.ts` using the atcute localhost exception:

```ts
const DEV_HOST = "127.0.0.1";
const DEV_PORT = 5173;
const DEV_REDIRECT = `http://${DEV_HOST}:${DEV_PORT}/`;
const DEV_CLIENT_ID =
  `http://localhost?redirect_uri=${encodeURIComponent(DEV_REDIRECT)}` +
  `&scope=${encodeURIComponent(
    "atproto repo:app.prismaliser.schema?action=create&action=delete",
  )}`;
```

Inside Vite's config, define `import.meta.env.VITE_OAUTH_CLIENT_ID` and
`VITE_OAUTH_REDIRECT_URI` for serve mode and set `server.host`/`server.port` to
these fixed values. Production derives from `location.origin`, so no production
secret or build argument is introduced.

- [ ] **Step 4: Gate analytics before script injection**

Create `shouldLoadAnalytics(url)` so it returns false for a legacy `code` query
or a fragment containing OAuth `code`/`error` plus `state`. Update `main.tsx` to
inject Umami only when the site ID exists and
`shouldLoadAnalytics(new URL(location.href))` is true.

Run:

```bash
nix develop --command yarn test src/atproto/oauth.test.ts src/util/analytics.test.ts
nix develop --command yarn lint
nix develop --command yarn build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
jj commit -m "feat: add browser AT Protocol OAuth"
```

---

### Task 5: Implement authenticated immutable repository operations

**Files:**

- Create: `src/atproto/repository.ts`
- Create: `src/atproto/repository.test.ts`

**Interfaces:**

- Consumes: `ConnectedSession`, `SnapshotDraft`, generated `Main`, record/link
  helpers.
- Produces: `createSnapshot`, `listSnapshots`, `deleteSnapshot`.
- Produces: `SnapshotPage`.

- [ ] **Step 1: Write failing create/list/delete tests against a transport
      seam**

Define test transport spies and assert:

- create input has the connected DID, exact collection, no explicit `rkey`, and
  a validated record;
- list input has `reverse: true`, `limit`, and cursor;
- malformed listed records are omitted with an issue count rather than crashing
  the manager;
- delete parses the URI and sends DID/collection/rkey;
- no update method exists.

Representative assertion:

```ts
expect(transport.createRecord).toHaveBeenCalledWith({
  repo: "did:plc:alice",
  collection: "app.prismaliser.schema",
  record: expect.objectContaining({
    $type: "app.prismaliser.schema",
    schema: draft.schema,
  }),
});
```

Run the test. Expected: FAIL because `repository.ts` does not exist.

- [ ] **Step 2: Implement a small transport interface and atcute adapter**

Use these domain signatures:

```ts
export interface RepositoryTransport {
  createRecord(input: {
    repo: string;
    collection: typeof PRISMALISER_COLLECTION;
    record: AppPrismaliserSchema.Main;
  }): Promise<{ uri: string; cid: string }>;
  listRecords(input: {
    repo: string;
    collection: typeof PRISMALISER_COLLECTION;
    cursor?: string;
    limit: number;
    reverse: true;
  }): Promise<{
    cursor?: string;
    records: Array<{ uri: string; cid: string; value: unknown }>;
  }>;
  deleteRecord(input: {
    repo: string;
    collection: typeof PRISMALISER_COLLECTION;
    rkey: string;
  }): Promise<void>;
}
```

`createAtcuteRepositoryTransport(client)` wraps
`client.post("com.atproto.repo.createRecord")`,
`client.get("com.atproto.repo.listRecords")`, and
`client.post("com.atproto.repo.deleteRecord")` with `ok()`.

`listSnapshots` validates each value, derives its label, and returns an
`invalidCount` for records it cannot display. It does not parse every schema
with Prisma WASM.

- [ ] **Step 3: Run tests and build**

```bash
nix develop --command yarn test src/atproto/repository.test.ts
nix develop --command yarn lint
nix develop --command yarn build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
jj commit -m "feat: add immutable snapshot repository operations"
```

---

### Task 6: Add the React Flow position snapshot boundary

**Files:**

- Create: `src/util/nodePositions.ts`
- Create: `src/util/nodePositions.test.ts`
- Modify: `src/components/FlowView.tsx:36-60,62-102,149-152`
- Modify: `src/util/types.ts`

**Interfaces:**

- Produces: `captureNodePositions`, `applyNodePositions`, `sameNodePositions`.
- Produces: `FlowViewHandle.getPositions(): NodePosition[]`.
- `FlowViewProps` gains
  `positionSeed?: { key: string; positions: NodePosition[] }` and
  `onPositionsChange?(positions): void`.

- [ ] **Step 1: Write failing pure position tests**

Create a complete test around structurally compatible nodes:

```ts
import { describe, expect, it } from "vitest";

import {
  applyNodePositions,
  captureNodePositions,
  sameNodePositions,
} from "~/util/nodePositions";

const nodes = [
  { id: "B", position: { x: 2.6, y: 5.4 } },
  { id: "A", position: { x: 10.2, y: -1.6 } },
];

describe("node positions", () => {
  it("captures rounded positions sorted by node ID", () => {
    expect(captureNodePositions(nodes)).toEqual([
      { id: "A", x: 10, y: -2 },
      { id: "B", x: 3, y: 5 },
    ]);
  });

  it("applies only positions for generated node IDs", () => {
    const applied = applyNodePositions(nodes, [
      { id: "A", x: 40, y: 50 },
      { id: "Missing", x: 100, y: 200 },
    ]);
    expect(applied.find(({ id }) => id === "A")?.position).toEqual({
      x: 40,
      y: 50,
    });
    expect(applied).toHaveLength(2);
  });

  it("compares integer-normalised positions without depending on order", () => {
    expect(
      sameNodePositions(
        [
          { id: "B", x: 3.2, y: 4.2 },
          { id: "A", x: 1.2, y: 2.2 },
        ],
        [
          { id: "A", x: 1, y: 2 },
          { id: "B", x: 3, y: 4 },
        ],
      ),
    ).toBe(true);
  });
});
```

Run the test. Expected: FAIL because the utility does not exist.

- [ ] **Step 2: Implement the pure utility**

The utility accepts the existing `DMMFToElementsResult["nodes"]`, never mutates
input nodes, rounds with `Math.round`, sorts by ID, applies only IDs that exist,
and compares normalised arrays field-by-field.

- [ ] **Step 3: Expose positions without lifting node state**

Convert `FlowView` to `forwardRef<FlowViewHandle, FlowViewProps>` and add:

```ts
export interface FlowViewHandle {
  getPositions(): NodePosition[];
}
```

Use `useImperativeHandle` to return the current captured positions. Track the
last applied `positionSeed.key` in a ref. When a new DMMF arrives:

- if the key changed, generate nodes without borrowing positions from the
  previous document, then apply the new seed once;
- if the key is unchanged, preserve current node positions as today;
- after node drag stop and Elk layout completion, call
  `onPositionsChange(captureNodePositions(nodes))`;
- do not call the parent on selection-only node changes.

Pass explicit `height` and `width` to the existing `ListTreeIcon` while touching
the control.

- [ ] **Step 4: Verify graph contracts**

```bash
nix develop --command yarn test src/util/nodePositions.test.ts src/util/prismaToFlow.test.ts src/util/layout.test.ts
nix develop --command yarn lint
nix develop --command yarn build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
jj commit -m "feat: expose graph position snapshots"
```

---

### Task 7: Add accessible connection and account UI

**Files:**

- Create: `src/components/Dialog.tsx`
- Create: `src/components/Dialog.module.css`
- Create: `src/components/ConnectDialog.tsx`
- Create: `src/components/AccountMenu.tsx`
- Create: `src/components/Sharing.module.css`
- Modify: `src/components/Nav.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/App.tsx`

**Interfaces:**

- Consumes: OAuth configure/finalize/resume/start/disconnect functions.
- Produces UI callbacks: `onConnect(handle)`, `onConnectBluesky()`,
  `onOpenShares()`, `onDisconnect()`.

- [ ] **Step 1: Build the reusable native dialog wrapper**

`DialogProps` must be:

```ts
export interface DialogProps {
  children: React.ReactNode;
  descriptionId?: string;
  open: boolean;
  titleId: string;
  onClose(): void;
}
```

On `open`, call `showModal()` and remember `document.activeElement`; on
close/unmount, close the element and restore focus. Handle native `cancel` by
preventing duplicate state transitions and invoking `onClose`. Render a visible
close button in each concrete dialog rather than making backdrop click the sole
close mechanism.

- [ ] **Step 2: Implement the approved Connect dialog exactly**

Render:

- **Connect an AT Protocol account**;
- **Use your account to publish and manage shared diagrams.**;
- Handle field with `alice.bsky.social`;
- helper **If you use Bluesky, this is your Bluesky handle.**;
- collapsed **What is an Atmosphere account?** native details;
- the approved public-record/password explanation;
- **Continue to your provider**;
- **Connect with Bluesky**.

Do not render a create-account action. Trim and validate the handle with
`isHandle` from `@atcute/lexicons/syntax` before calling OAuth, retaining the
entered value on validation failure. Disable submission only while metadata
validation or authorisation is in progress. Announce failures in `role="alert"`
without replacing the entered handle. When an authorisation server rejects the
granular repository scope, say that the provider cannot grant Prismaliser's
narrow permission; never offer or request `transition:generic`.

- [ ] **Step 3: Add the account menu and Nav props**

Export:

```ts
export interface NavProps {
  account: { did: string; handle?: string } | null;
  atprotoAvailable: boolean;
  onConnect(): void;
  onDisconnect(): void;
  onOpenShares(): void;
}
```

`AccountMenu` uses a button with `aria-expanded`/`aria-controls`, closes on
Escape and outside pointer down, and contains identity text, **My shares**, and
**Disconnect**. `Layout` accepts and passes these nav props instead of hiding
account state in a context.

- [ ] **Step 4: Add ordered session bootstrap to App**

Replace independent startup effects with one guarded async bootstrap that:

1. configures OAuth;
2. validates metadata availability;
3. finalises and scrubs a callback when present;
4. otherwise resumes `ACTIVE_DID_KEY`;
5. stores `ConnectedSession | null`;
6. restores a pending Share dialog draft after successful callback.

React Strict Mode must not finalise the same callback twice; use a module-level
callback promise or an effect ref guard whose cleanup does not erase a completed
result.

- [ ] **Step 5: Browser-smoke the connection UI**

Start a Hub process named `prismaliser-dev` with application `nix`, arguments
`["develop", "--command", "yarn", "dev"]`, working directory set to the
repository root, and readiness port `5173`. Stop it through Hub after the
browser checks.

In Chromium verify keyboard focus, Escape, details toggle, invalid handle
preservation, Bluesky shortcut navigation, callback hash scrubbing, account
menu, and disconnect. Deny one OAuth request and confirm no schema text changes.

- [ ] **Step 6: Run static checks and commit**

```bash
nix develop --command yarn lint
nix develop --command yarn test
nix develop --command yarn build
jj commit -m "feat: add AT Protocol account connection UI"
```

---

### Task 8: Replace Copy link with the unified Share dialog

**Files:**

- Create: `src/components/ShareDialog.tsx`
- Create: `src/components/ShareButton.tsx`
- Modify: `src/components/Sharing.module.css`
- Modify: `src/App.tsx`
- Remove: `src/components/CopyButton.tsx`

**Interfaces:**

- Consumes: `FlowViewHandle`, `SnapshotDraft`, OAuth pending storage,
  `createSnapshot`, `createAtShareUrl`, `createLegacyShareUrl`.
- Produces: current snapshot baseline after publication and copied/manual
  canonical link state.

- [ ] **Step 1: Implement ShareDialog as a controlled form**

Use this prop contract:

```ts
export interface ShareDialogProps {
  accountConnected: boolean;
  error?: string;
  manualLink?: string;
  open: boolean;
  pending: boolean;
  onClose(): void;
  onConnect(name?: string): void;
  onCopyLegacy(): void;
  onPublish(name?: string): void;
}
```

The dialog renders optional Name, immutable snapshot explanation, visible
**Shared schemas are public** warning, primary **Publish and copy link**, and
secondary **Copy a schema-only link without publishing**. Logged-out primary
text becomes **Connect to publish** and calls `onConnect(name)`; `App` combines
that name with current schema and captured positions before persistence.

- [ ] **Step 2: Wire capture and pending login in App**

Keep a `FlowViewHandle` ref. Opening Share captures
`flowRef.current.getPositions()` only when submitting, so the record contains
the latest drag/layout state. When connection is required:

1. create `SnapshotDraft` from current text/name/positions;
2. call `savePendingShare`;
3. start OAuth;
4. after callback, call `takePendingShare` and reopen the same dialog;
5. require a second explicit Publish click.

- [ ] **Step 3: Wire immutable publication and clipboard fallback**

On Publish:

1. call `createSnapshot`;
2. create canonical URL from returned URI;
3. attempt `navigator.clipboard.writeText`;
4. set the returned record as the current snapshot baseline;
5. update the query with `history.replaceState`;
6. show **Copied!** on clipboard success or a selected manual-link field on
   clipboard failure.

Do not catch an OAuth/session error as publication success and never issue an
automatic retry mutation.

- [ ] **Step 4: Preserve anonymous link creation**

The secondary action calls `createLegacyShareUrl(text)` and retains the existing
two-second Copied state. It never includes node positions or triggers login.

- [ ] **Step 5: Browser-smoke both share paths**

Verify logged-out secondary copy, logged-out primary redirect/restore, logged-in
publication, optional blank name omission, current node positions in the record,
and manual clipboard fallback using denied clipboard permission.

- [ ] **Step 6: Run checks and commit**

```bash
nix develop --command yarn lint
nix develop --command yarn test
nix develop --command yarn build
jj commit -m "feat: publish immutable AT Protocol snapshots"
```

---

### Task 9: Load shared snapshots transactionally and show attribution

**Files:**

- Create: `src/components/SnapshotBar.tsx`
- Modify: `src/components/Sharing.module.css`
- Modify: `src/App.tsx`
- Modify: `src/components/FlowView.tsx`

**Interfaces:**

- Consumes: `parseShareLocation`, `loadPublicRecord`, `getDMMF`, position seed,
  baseline equality.
- Produces: non-destructive loading/error state and `SnapshotBar` status
  `original | modified | deleted`.

- [ ] **Step 1: Add one ordered workspace loader in App**

After OAuth bootstrap, parse the query exactly once:

- `local` loads existing local storage state;
- `legacy` sets decoded schema with no position seed;
- `invalid` shows an error panel and leaves local schema untouched;
- `at` starts a generation-guarded staged load.

The staged AT load must:

1. retrieve and validate the record;
2. call `getDMMF(record.schema)` before changing `text`;
3. construct a `positionSeed` keyed by record URI;
4. atomically commit text, DMMF, seed, and `LoadedSnapshot`;
5. ignore completion when its `AbortController` was cancelled or generation is
   stale.

A valid record whose schema fails parsing shows existing Prisma diagnostics in
the error panel but does not replace the local draft.

- [ ] **Step 2: Add precise read error presentation**

Map codes to visible copy and actions:

- `not-found`: **This shared snapshot was deleted or could not be found.**
- `unreachable`: **The snapshot is temporarily unreachable.** plus Retry.
- `pds-cors`: explain Slingshot is unavailable and the author's PDS blocked a
  browser read.
- `invalid-record`: **This record is not a valid Prismaliser snapshot.**

Retry repeats only reads. It never publishes or deletes.

- [ ] **Step 3: Implement SnapshotBar and modified comparison**

`SnapshotBarProps`:

```ts
export interface SnapshotBarProps {
  label: string;
  author: string;
  createdAt: string;
  status: "original" | "modified" | "deleted";
  onCopyOriginal(): void;
}
```

The bar renders compact label/author/date, explicit **Modified locally** or
**Deleted from repository**, and **Copy original link**. Compare exact schema
text and `sameNodePositions` against the loaded baseline. Position callbacks set
modified only when normalised values differ; exact reversion clears it.

- [ ] **Step 4: Verify legacy and AT links in production browser**

Run `nix develop --command yarn build`, then start a Hub process named
`prismaliser-preview` with application `nix`, arguments
`["develop", "--command", "yarn", "start", "--host", "127.0.0.1"]`, and
readiness port `4173`. Open these cases, then stop the process through Hub:

- an existing real `?code=` URL;
- a valid AT snapshot URL signed out;
- a wrong-collection URL;
- a deleted/nonexistent record;
- a valid record with malformed Prisma schema in a controlled test repository.

Confirm the local stored draft survives every failing case and saved positions
render before any manual disperse action.

- [ ] **Step 5: Run checks and commit**

```bash
nix develop --command yarn lint
nix develop --command yarn test
nix develop --command yarn build
jj commit -m "feat: open attributed AT Protocol snapshots"
```

---

### Task 10: Add the full My shares manager

**Files:**

- Create: `src/components/SharesDialog.tsx`
- Modify: `src/components/Sharing.module.css`
- Modify: `src/App.tsx`
- Modify: `src/components/AccountMenu.tsx`

**Interfaces:**

- Consumes: `listSnapshots`, `deleteSnapshot`, `createAtShareUrl`, loaded
  snapshot state.
- Produces: paginated/searchable owner manager and open-snapshot deletion state.

- [ ] **Step 1: Implement controlled manager state**

Use this prop contract:

```ts
export interface SharesDialogProps {
  error?: string;
  loading: boolean;
  open: boolean;
  page: SnapshotPage;
  query: string;
  deletingUri?: string;
  onClose(): void;
  onCopy(uri: string): void;
  onDelete(uri: string): void;
  onLoadMore(): void;
  onOpen(uri: string): void;
  onQueryChange(query: string): void;
}
```

Rows show label, first node IDs, creation date, and Open/Copy/Delete. Search
only loaded records by lower-cased explicit name and non-virtual node IDs.
Preserve server cursor separately from the filtered visible list. Announce
omitted invalid records as **N invalid records were hidden** without exposing
payloads.

- [ ] **Step 2: Load newest-first pages from the connected PDS**

Opening My shares resets state and calls `listSnapshots({ limit: 50 })`. Load
more appends unique URIs and advances the cursor. A session expiry closes
neither manager nor loaded rows; it presents **Reconnect to continue** and
resumes only after explicit reconnection.

- [ ] **Step 3: Implement open/copy/delete actions**

- Open assigns the canonical AT URL, closes the manager, and starts the same
  transactional loader from Task 9.
- Copy writes the canonical URL and falls back to a selectable field.
- Delete opens a named confirmation explaining canonical deletion and cache
  persistence.
- After PDS confirmation, remove the row.
- If the deleted URI equals the loaded snapshot URI, retain schema/positions and
  set snapshot status to `deleted`.
- Never optimistically remove before PDS confirmation.

- [ ] **Step 4: Browser-smoke manager behaviour**

With more than one published snapshot, verify newest order, unnamed derived
labels, search, Open, Copy, Load more, cancel deletion, confirm deletion, failed
deletion retention, and deleting the current snapshot.

- [ ] **Step 5: Run checks and commit**

```bash
nix develop --command yarn lint
nix develop --command yarn test
nix develop --command yarn build
jj commit -m "feat: manage published Prismaliser snapshots"
```

---

### Task 11: Complete deployment metadata, Lexicon publication, and end-to-end verification

**Files:**

- Create: `public/oauth-client-metadata.json`
- Modify: `Caddyfile`
- Modify: `README.md:18-60`
- Verify: `lexicons/app/prismaliser/schema.json`

**Interfaces:**

- Consumes: exact OAuth scope and deployment origin contract.
- Produces: hosted metadata, runtime Docker metadata, documented static-host
  metadata, and network-resolvable Lexicon authority.

- [ ] **Step 1: Add hosted production metadata**

Create `public/oauth-client-metadata.json`:

```json
{
  "client_id": "https://prismaliser.app/oauth-client-metadata.json",
  "client_name": "Prismaliser",
  "client_uri": "https://prismaliser.app",
  "redirect_uris": ["https://prismaliser.app/"],
  "scope": "atproto repo:app.prismaliser.schema?action=create&action=delete",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
}
```

Build and verify it is copied unchanged to `dist/oauth-client-metadata.json`
with `application/json` when served by Vite preview.

- [ ] **Step 2: Serve origin-specific Docker metadata**

Replace `Caddyfile` with a route that responds to `/oauth-client-metadata.json`
before `file_server`, sets `Content-Type: application/json`, and substitutes
`{$PRISMALISER_ORIGIN}` into `client_id`, `client_uri`, and `redirect_uris`.
Keep `/srv` static serving unchanged for every other path.

```caddyfile
:80 {
  @oauthMetadata path /oauth-client-metadata.json
  handle @oauthMetadata {
    header Content-Type application/json
    respond `{
      "client_id":"{$PRISMALISER_ORIGIN}/oauth-client-metadata.json",
      "client_name":"Prismaliser",
      "client_uri":"{$PRISMALISER_ORIGIN}",
      "redirect_uris":["{$PRISMALISER_ORIGIN}/"],
      "scope":"atproto repo:app.prismaliser.schema?action=create&action=delete",
      "grant_types":["authorization_code","refresh_token"],
      "response_types":["code"],
      "token_endpoint_auth_method":"none",
      "application_type":"web",
      "dpop_bound_access_tokens":true
    }` 200
  }

  handle {
    root * /srv
    file_server
  }
}
```

Document and enforce `PRISMALISER_ORIGIN` as a public HTTPS origin without a
trailing slash. Do not bake it into the builder stage; it is a Caddy runtime
environment value.

Build the finite image:

```bash
docker build -t prismaliser-atproto .
```

Start a Hub process named `prismaliser-docker` with application `docker`,
arguments
`["run", "--rm", "-p", "3000:80", "-e", "PRISMALISER_ORIGIN=https://prismaliser.example", "prismaliser-atproto"]`,
and readiness port `3000`. Stop it through Hub after checking the metadata
response.

Expected from `http://127.0.0.1:3000/oauth-client-metadata.json`: JSON fields
consistently contain `https://prismaliser.example`; content type is JSON. With
the variable absent, the browser metadata validator disables Connect while
editing and legacy sharing remain usable.

- [ ] **Step 3: Document static and Docker self-host requirements**

Update `README.md` to explain:

- AT snapshots are public records stored in the user's own repository;
- schema-only links need no account;
- Docker uses `-e PRISMALISER_ORIGIN=https://your-public-origin.example`;
- plain static hosts must replace `oauth-client-metadata.json` with values
  matching their exact HTTPS origin;
- invalid/missing metadata disables only account connection;
- no password or app password is entered into Prismaliser.

Update the Roadmap entries for saved node positions and sharing to reflect the
implemented snapshot behaviour rather than adding a changelog.

- [ ] **Step 4: Publish the Lexicon through a dedicated project authority**

Create or select the dedicated Prismaliser AT account, then authenticate goat
without placing credentials in repository files:

```bash
goat account login
```

From the repository root publish all local Lexicons:

```bash
goat lex publish
```

Configure DNS exactly:

```text
_lexicon.prismaliser.app TXT "did=<dedicated Prismaliser authority DID>"
```

The value inside angle brackets is replaced in DNS with the DID printed for the
dedicated account; it is an operational credential-derived value, not source
code. After DNS propagation, verify from a clean directory:

```bash
goat lex pull app.prismaliser.schema
```

Expected: green success and a pulled schema byte-equivalent in
fields/constraints to `lexicons/app/prismaliser/schema.json`.

- [ ] **Step 5: Run the full local QA bar**

```bash
nix develop --command yarn lex:check
nix develop --command yarn lint
nix develop --command yarn test
nix develop --command yarn build
```

Expected: all commands exit 0; existing Prisma WASM tests remain green.

- [ ] **Step 6: Run production-browser acceptance**

Using a real OAuth-capable test account and production build:

1. connect by handle;
2. disconnect and connect through the Bluesky shortcut;
3. deny authorisation once and retry without losing the schema;
4. move nodes and publish a named snapshot;
5. open its link signed out and compare schema and positions;
6. edit text and move a node, observe **Modified locally**, then restore both
   and observe it clear;
7. create and open a schema-only link;
8. search/paginate/copy/open in My shares;
9. intercept Slingshot to fail and observe direct-PDS success;
10. intercept both paths and observe non-destructive retry;
11. delete the current snapshot and observe retained local content plus
    **Deleted from repository**;
12. reopen its link and observe not-found;
13. complete every dialog/menu/details/delete path by keyboard;
14. inspect browser storage and network logs to confirm no password, schema
    analytics payload, callback fragment, or broad OAuth scope is sent.

- [ ] **Step 7: Commit**

```bash
jj commit -m "feat: complete AT Protocol sharing support"
```

## Execution Notes

- Before implementation, create an isolated worktree with the
  `using-git-worktrees` skill.
- Task 1 must land before any task importing generated types.
- Tasks 3, 4, 5, and 6 depend only on Task 2 and can be developed independently
  after Task 1.
- UI tasks 7–10 are sequential because they integrate the preceding public
  interfaces into `App`.
- The live Lexicon publication in Task 11 requires control of Prismaliser DNS
  and the dedicated authority account; all repository work and local
  verification can complete before DNS propagation, but production launch is not
  complete until `goat lex pull app.prismaliser.schema` succeeds.
