# AT Protocol schema blobs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Prisma schema text as a validated `text/plain` AT Protocol blob, store only its blob reference in `app.prismaliser.schema` records, and load that blob through the author's PDS for public snapshots.

**Architecture:** Keep `SnapshotDraft.schema` as editor text, but make the repository publication boundary upload a UTF-8 `Blob` before creating the immutable record. Change the record lexicon to a required blob, validate MIME and size explicitly because atcute's normal parser does not enforce blob constraints, and extend public loading so Slingshot resolves record metadata first while the author's PDS supplies the schema bytes through `com.atproto.sync.getBlob`.

**Tech Stack:** TypeScript, React/Vite, Vitest, atcute client and lexicons, AT Protocol OAuth, Slingshot, Caddy, `lex-cli`.

## Global Constraints

- Use the existing `app.prismaliser.schema` collection; do not add a second collection or a string/blob union.
- Existing inline-string records are intentionally incompatible after the cutover.
- Request the exact scope `atproto repo:app.prismaliser.schema?action=create&action=delete blob?accept=text/plain`; never request `transition:generic`.
- Keep the schema blob MIME type exactly `text/plain` and enforce a 500,000-byte UTF-8 ceiling before upload and after download.
- Keep Slingshot-first record loading and direct DID-to-PDS fallback; Slingshot is not a blob fallback.
- Map browser network failures from direct PDS blob requests to `pds-cors`; malformed blob content is `invalid-record`.
- Do not add blob deletion or server-side proxying.
- Generate `src/lexicons/types/**` from JSON; never hand-edit generated lexicon modules.
- Follow the repository's TypeScript, import ordering, strict-mode, React, and formatting conventions.

---

### Task 1: Change the lexicon and shared blob validation

**Files:**
- Modify: `lexicons/app/prismaliser/schema.json:18-21`
- Regenerate: `src/lexicons/types/app/prismaliser/schema.ts`
- Modify: `src/atproto/constants.ts:1-9`
- Modify: `src/atproto/record.ts:1-58`
- Test: `src/atproto/record.test.ts`

**Interfaces:**
- Produce `MAX_SCHEMA_BLOB_BYTES = 500_000` and `SCHEMA_BLOB_MIME_TYPE = "text/plain"` from `src/atproto/constants.ts`.
- Produce a shared schema-blob validator in `src/atproto/record.ts` that accepts the generated `AppPrismaliserSchema.Main["schema"]` shape and rejects inline strings, wrong MIME types, missing/invalid CID links, and declared sizes outside `0..MAX_SCHEMA_BLOB_BYTES`.
- Keep `SnapshotDraft.schema: string`; change `createShareRecord` to consume a validated schema blob reference rather than raw schema text.

- [ ] **Step 1: Write failing record tests**

Change the record fixture from an inline string to a modern blob reference and add focused cases:

```ts
const validSchemaBlob = {
  $type: "blob" as const,
  mimeType: "text/plain",
  ref: { $link: "bafkreigh2akiscaildcqpo6n3v6r5q6a6bq4q6qk7u2f5m2a3r6b4d5c6e" },
  size: 28,
};

it("accepts a text schema blob and rejects an inline schema", () => {
  expect(parseShareRecord({ ...valid, schema: validSchemaBlob }).schema).toEqual(
    validSchemaBlob,
  );
  expect(() => parseShareRecord({ ...valid, schema: valid.schema })).toThrow(
    ShareRecordValidationError,
  );
});

it.each([
  ["wrong MIME", { ...validSchemaBlob, mimeType: "application/json" }],
  ["oversized", { ...validSchemaBlob, size: 500_001 }],
])("rejects a schema blob with %s", (_, schema) => {
  expect(() => parseShareRecord({ ...valid, schema })).toThrow(
    ShareRecordValidationError,
  );
});
```

Retain the existing position-normalisation, duplicate-position, and record-ceiling tests, adapting their fixtures to the blob field.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run:

```bash
nix develop --command yarn vitest run src/atproto/record.test.ts
```

Expected: FAIL because the generated lexicon still requires a string and `createShareRecord` still takes schema text.

- [ ] **Step 3: Change the lexicon JSON and constants**

Use this property shape:

```json
"schema": {
  "type": "blob",
  "accept": ["text/plain"],
  "maxSize": 500000
}
```

Set the OAuth constant to:

```ts
export const PRISMALISER_OAUTH_SCOPE =
  "atproto repo:app.prismaliser.schema?action=create&action=delete blob?accept=text/plain";
```

- [ ] **Step 4: Regenerate the atcute module**

Run:

```bash
nix develop --command yarn lex:generate
```

Confirm the generated `Main["schema"]` is a blob reference and the generated validator contains the blob constraints. Do not edit the generated file manually.

- [ ] **Step 5: Implement explicit blob validation and record construction**

Implement the validator at the application boundary rather than relying only on `safeParse`, because atcute's default parser does not enforce blob `accept` and `maxSize`. Make `parseShareRecord` call it after generated lexicon validation, and make `createShareRecord` accept the validated blob reference while retaining all existing position/name/timestamp behaviour.

- [ ] **Step 6: Run focused record and lexicon tests**

Run:

```bash
nix develop --command yarn vitest run src/atproto/record.test.ts
nix develop --command yarn lex:check
```

Expected: all record tests pass and `lex:check` reports no generated diff.

- [ ] **Step 7: Commit the lexicon and validation change**

```bash
jj commit -m "feat: store snapshot schemas as blobs"
```

---

### Task 2: Update OAuth metadata and permission wording

**Files:**
- Modify: `public/oauth-client-metadata.json:6`
- Modify: `Caddyfile:10`
- Modify: `src/components/ConnectDialog.tsx:184-217`
- Test: `src/atproto/oauth.test.ts`
- Test: `src/components/ConnectDialog.test.tsx`

**Interfaces:**
- Hosted metadata, Docker metadata, OAuth validation, and development metadata must all use `PRISMALISER_OAUTH_SCOPE` with the direct blob permission.
- The connection dialog must say that sharing publishes public diagram data and plain-text schema content to the connected account's repository; retain the existing secret warning.

- [ ] **Step 1: Add failing metadata assertions**

Extend the metadata fixture/assertions so a valid document must contain:

```ts
scope: "atproto repo:app.prismaliser.schema?action=create&action=delete blob?accept=text/plain",
```

Keep the existing negative test proving that adding `transition:generic` is rejected. The browser smoke in Task 5 will verify the updated permission wording because the current component test suite covers error mapping, not rendered copy.

- [ ] **Step 2: Run the focused OAuth tests and verify failure**

```bash
nix develop --command yarn vitest run src/atproto/oauth.test.ts src/components/ConnectDialog.test.tsx
```

Expected: metadata tests fail until the source declarations are updated.

- [ ] **Step 3: Update all deployed metadata and dialog copy**

Change both static and Caddy-generated JSON to the exact constant value. Keep `ConnectDialog`'s granular rejection heuristic based on the repository collection scope, and update the explanatory copy without offering broader permissions.

- [ ] **Step 4: Run focused tests and inspect exact metadata**

```bash
nix develop --command yarn vitest run src/atproto/oauth.test.ts src/components/ConnectDialog.test.tsx
nix develop --command yarn build
```

Expected: tests and build pass. The generated `dist/oauth-client-metadata.json` must contain the blob permission.

- [ ] **Step 5: Commit OAuth metadata changes**

```bash
jj commit -m "feat: request schema blob permission"
```

---

### Task 3: Upload the schema blob before creating snapshots

**Files:**
- Modify: `src/atproto/repository.ts:24-82`
- Modify: `src/atproto/record.ts:15-58`
- Test: `src/atproto/repository.test.ts`

**Interfaces:**
- Extend `RepositoryTransport` with:

```ts
uploadBlob(input: {
  blob: Blob;
}): Promise<{ blob: AppPrismaliserSchema.Main["schema"] }>;
```

- Keep `createSnapshot(session, draft, transport?)` as the application publication entrypoint, but make its implementation explicitly await blob upload before record creation.

- [ ] **Step 1: Write failing repository tests**

Add a transport fixture with `uploadBlob` and tests that record call order:

```ts
it("uploads the schema blob before creating the record", async () => {
  const transport = createTransport();
  const calls: string[] = [];
  vi.mocked(transport.uploadBlob).mockImplementation(async ({ blob }) => {
    calls.push(`upload:${blob.type}:${blob.size}`);
    return { blob: validSchemaBlob };
  });
  vi.mocked(transport.createRecord).mockImplementation(async (input) => {
    calls.push(`create:${input.record.schema.mimeType}`);
    return created;
  });

  await expect(createSnapshot(session, draft, transport)).resolves.toEqual(created);
  expect(calls).toEqual(["upload:text/plain:28", "create:text/plain"]);
});

it("does not create a record when blob upload fails", async () => {
  const transport = createTransport();
  vi.mocked(transport.uploadBlob).mockRejectedValue(new Error("upload failed"));

  await expect(createSnapshot(session, draft, transport)).rejects.toThrow(
    "upload failed",
  );
  expect(transport.createRecord).not.toHaveBeenCalled();
});
```

Also assert that the uploaded body contains the exact schema text and uses `text/plain`, and adapt existing create-record expectations to the returned blob reference.

- [ ] **Step 2: Run repository tests and verify failure**

```bash
nix develop --command yarn vitest run src/atproto/repository.test.ts
```

Expected: TypeScript/test failures because the transport lacks `uploadBlob` and `createSnapshot` still sends inline text.

- [ ] **Step 3: Implement the atcute transport method**

Import `ComAtprotoRepoUploadBlob` and call:

```ts
ok(
  client.post("com.atproto.repo.uploadBlob", {
    input: input.blob,
  }),
)
```

The `Blob` body must be the browser `Blob` containing schema UTF-8 bytes and `type: "text/plain"`.

- [ ] **Step 4: Implement upload-before-create publication**

In `createSnapshot`, construct the schema `Blob`, reject it locally when its UTF-8 byte size exceeds `MAX_SCHEMA_BLOB_BYTES`, await `transport.uploadBlob`, validate the returned blob reference, pass that reference to `createShareRecord`, and only then call `transport.createRecord`.

- [ ] **Step 5: Update atcute transport tests**

Make the fake `post` return an upload response for `com.atproto.repo.uploadBlob`, retain create/delete response handling, and assert the exact binary input and endpoint. Keep the existing failed-XRPC test for record creation.

- [ ] **Step 6: Run focused repository tests and build**

```bash
nix develop --command yarn vitest run src/atproto/repository.test.ts
nix develop --command yarn build
```

Expected: all repository tests pass and TypeScript accepts the asynchronous upload path.

- [ ] **Step 7: Commit repository publication changes**

```bash
jj commit -m "feat: upload schema blobs before snapshots"
```

---

### Task 4: Retrieve and decode blobs during public snapshot loading

**Files:**
- Modify: `src/atproto/publicRecords.ts:16-245`
- Test: `src/atproto/publicRecords.test.ts`

**Interfaces:**
- Extend `PublicRecordDependencies` with:

```ts
blob(
  pds: string,
  did: string,
  cid: string,
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; contentType: string | null }>;
```

- Keep `loadPublicRecord(uri, options?) => Promise<LoadedSnapshot>` and the existing `PublicRecordLoadError` codes.

- [ ] **Step 1: Write failing public-loader tests**

Change the public record fixture to contain `validSchemaBlob`, then add tests for the two successful paths:

```ts
it("loads schema text from the author's PDS after a Slingshot record hit", async () => {
  const blob = vi.fn().mockResolvedValue({
    bytes: new TextEncoder().encode("model User { id Int @id }"),
    contentType: "text/plain",
  });
  const loaded = await loadPublicRecord(uri, {
    slingshot: vi.fn().mockResolvedValue(envelope),
    resolveActor: vi.fn().mockResolvedValue(author),
    blob,
  });

  expect(blob).toHaveBeenCalledWith(
    author.pds,
    author.did,
    validSchemaBlob.ref.$link,
    undefined,
  );
  expect(loaded.schema).toBe("model User { id Int @id }");
});

it("uses direct record and blob fallback after Slingshot failure", async () => {
  const direct = vi.fn().mockResolvedValue(envelope);
  const blob = vi.fn().mockResolvedValue({
    bytes: new TextEncoder().encode("model User { id Int @id }"),
    contentType: "text/plain",
  });

  const loaded = await loadPublicRecord(uri, {
    slingshot: vi.fn().mockRejectedValue(new TypeError("offline")),
    direct,
    resolveActor: vi.fn().mockResolvedValue(author),
    blob,
  });

  expect(direct).toHaveBeenCalledWith(author.pds, uri, undefined);
  expect(blob).toHaveBeenCalledWith(
    author.pds,
    author.did,
    validSchemaBlob.ref.$link,
    undefined,
  );
  expect(loaded.schema).toBe("model User { id Int @id }");
});
```

Add focused failure cases for wrong content type, declared/received size over 500,000 bytes, missing blob, invalid UTF-8, and a `TypeError` from the blob dependency mapping to `pds-cors`. Assert the abort signal reaches Slingshot, actor resolution, direct record, and blob calls.

- [ ] **Step 2: Run public-loader tests and verify failure**

```bash
nix develop --command yarn vitest run src/atproto/publicRecords.test.ts
```

Expected: FAIL because the loader still returns inline record schema and has no blob dependency.

- [ ] **Step 3: Implement the default PDS blob request**

Use atcute's standard `com.atproto.sync.getBlob` query with `{ did, cid }`, `as: "bytes"`, and the abort signal. Return bytes plus the response `content-type` header. Catch fetch/network `TypeError`s from this direct request and convert them to `PublicRecordLoadError("pds-cors")`; preserve definitive XRPC failures for normalisation.

- [ ] **Step 4: Refactor the loader around a validated record plus blob fetch**

Keep Slingshot-first record retrieval and direct-record fallback, but after either record result:

1. validate the record and blob reference;
2. resolve the actor to obtain the PDS even after a Slingshot hit;
3. explicitly validate the reference MIME and declared size;
4. fetch the referenced blob using the author DID and CID;
5. require response content type `text/plain` (allowing parameters such as `charset=utf-8`);
6. enforce the received UTF-8 byte ceiling;
7. decode with `new TextDecoder("utf-8", { fatal: true })`;
8. build `LoadedSnapshot` with decoded schema text.

Do not fetch blobs while listing snapshots. Keep invalid content as `invalid-record`, network/CORS failures as `pds-cors`, and preserve existing not-found/unreachable behaviour.

- [ ] **Step 5: Add default endpoint tests**

Use a stubbed `fetch` response to verify the request URL contains `com.atproto.sync.getBlob`, the expected `did` and `cid`, and that a non-JSON binary response is decoded through atcute's `bytes` response path. Add a rejected-fetch case proving `pds-cors` mapping.

- [ ] **Step 6: Run focused public-loader tests and the full AT Protocol suite**

```bash
nix develop --command yarn vitest run src/atproto/publicRecords.test.ts src/atproto/record.test.ts src/atproto/repository.test.ts
```

Expected: all focused tests pass, including existing attribution and fallback cases.

- [ ] **Step 7: Commit public blob loading changes**

```bash
jj commit -m "feat: load snapshot schemas from blobs"
```

---

### Task 5: Update application fixtures, documentation, and verify the complete flow

**Files:**
- Modify: `src/components/ConnectDialog.tsx:184-217`
- Modify: `README.md:63-78`
- Modify: `src/atproto/publicRecords.test.ts` fixtures
- Modify: `src/atproto/repository.test.ts` fixtures

**Interfaces:**
- Existing `App` publish, share-manager, and snapshot-bar callsites continue to consume `createSnapshot` and `loadPublicRecord` without inline-schema record assumptions.
- The shares manager remains metadata-only and opening a share invokes the transactional loader.

- [ ] **Step 1: Run the full test suite before final changes**

```bash
nix develop --command yarn test
```

Expected: any remaining failures identify stale inline-schema fixtures or callsites; update only those fixtures/callsites to the blob contract.

- [ ] **Step 2: Verify generated lexicons and all scope declarations**

```bash
nix develop --command yarn lex:check
```

Then confirm the exact scope appears in `src/atproto/constants.ts`, `public/oauth-client-metadata.json`, and `Caddyfile`, with no `transition:generic` fallback.

- [ ] **Step 3: Run static checks**

```bash
nix develop --command yarn lint
nix develop --command yarn build
```

Expected: zero lint errors and a successful production build; existing repository warning count may remain unchanged.

- [ ] **Step 4: Smoke-test production paths**

Run the production preview and exercise:

- a schema-only link, confirming it remains anonymous and unchanged;
- an invalid AT link, confirming the local editor is preserved;
- a malformed/absent blob path, confirming the invalid-record state;
- the OAuth metadata endpoint, confirming `application/json` and the blob permission;
- the expanded account-connection explanation, confirming it mentions public plain-text schema publication and the existing secret warning;
- Docker with `PRISMALISER_ORIGIN`, confirming origin substitution and the same scope.

A valid live blob-backed snapshot requires an OAuth account/PDS record. If no such record is available, report that provider-side limitation explicitly rather than substituting a fake success.

- [ ] **Step 5: Commit final integration/documentation changes**

```bash
jj commit -m "test: verify schema blob sharing flow"
```

- [ ] **Step 6: Run the final QA bar**

```bash
nix develop --command yarn lint && \
nix develop --command yarn test && \
nix develop --command yarn build
```

Expected: all commands exit successfully. Preserve any unrelated user UI changes and do not reformat untouched files.
