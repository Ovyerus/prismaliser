# Prismaliser AT Protocol schema blobs

- **Status:** approved design
- **Date:** 2026-07-26
- **Scope:** migrate `app.prismaliser.schema` snapshots from inline schema text to AT Protocol blobs

## Goal

Store Prisma schema text as a user-repository blob rather than embedding it in every immutable snapshot record. This reduces record size and lets PDSes deduplicate identical schema content by CID. Snapshot records continue to contain graph positions and publication metadata.

## Compatibility decision

This is a strict blob-only cutover in the existing `app.prismaliser.schema` collection. Existing records whose `schema` field is an inline string are intentionally no longer supported. They will fail Prismaliser's updated lexicon validation and their links will stop loading.

No second collection and no legacy string/blob union will be introduced.

## Lexicon

Update `lexicons/app/prismaliser/schema.json`:

- change `main.record.properties.schema` from a string to a blob
- set `accept` to `text/plain`
- retain a 500,000-byte maximum for schema content via the blob's `maxSize`
- keep `schema` required
- leave positions, Prisma version, creation timestamp, and optional name unchanged

Regenerate `src/lexicons/types/app/prismaliser/schema.ts` using the repository's lexicon generation command and ensure the generated validator and `Main` type expose a blob reference.

## OAuth permissions and deployment metadata

Uploading a blob is a separate AT Protocol permission. Extend the exact OAuth scope everywhere it is declared:

```text
atproto repo:app.prismaliser.schema?action=create&action=delete blob?accept=text/plain
```

Update the hosted metadata and origin-aware Docker metadata. The login UI must explain that Prismaliser requests permission to publish plain-text schema blobs as part of sharing. No password or app-password flow is added.

## Authenticated publication flow

`SnapshotDraft` continues to carry editor schema text because that is the application-facing input. The repository publication layer becomes asynchronous and performs these operations in order:

1. Create a browser `Blob` from the schema text using UTF-8 and MIME type `text/plain`.
2. Call `com.atproto.repo.uploadBlob` through the authenticated atcute client.
3. Validate the returned blob reference and its declared MIME type/size.
4. Build and validate the immutable snapshot record with that blob reference in `schema`.
5. Call `com.atproto.repo.createRecord` with the validated record.
6. Return the created record URI/CID as before.

A failed upload must not attempt record creation. A failed record creation may leave an orphaned uploaded blob; the standard repository API has no safe blob-delete operation, so no invented cleanup request will be made.

The repository transport will expose upload as a dependency-injectable operation so ordering and failure behavior can be tested without network access. Existing list and delete operations remain unchanged.

## Record validation

`parseShareRecord` continues to validate the complete record against the generated lexicon and the overall record byte ceiling. Because atcute's normal `safeParse` path does not enforce blob `accept` and `maxSize` constraints, Prismaliser must explicitly check the schema blob's declared MIME type and declared byte size in its own validation boundary. Inline strings are rejected.

`createShareRecord` will accept a validated blob reference rather than raw schema text. Position rounding, deterministic sorting, optional-name trimming, Prisma version, timestamp generation, duplicate-position detection, and record-size checks remain unchanged.

## Public loading flow

Public record loading remains Slingshot-first for the record envelope, with direct DID-to-PDS fallback for the record. Because Slingshot currently exposes cached record queries but not blob retrieval, loading a valid record requires resolving the author DID to its PDS and fetching the referenced blob with the standard `com.atproto.sync.getBlob` query. This means even a Slingshot record hit now requires actor resolution and a browser-readable PDS blob request.

The loader will:

1. Parse and validate the AT URI.
2. Request the record from Slingshot.
3. If Slingshot fails, resolve the DID's PDS and request the record directly.
4. Validate the record envelope and blob reference.
5. Resolve the author PDS when necessary and fetch the blob by author DID and blob CID.
6. Require the expected `text/plain` content and enforce the schema byte ceiling using explicit application checks, not only generated lexicon validation.
7. Decode the bytes as strict UTF-8; malformed UTF-8 is an invalid record.
8. Return the existing `LoadedSnapshot` shape with decoded `schema` text, positions, metadata, and attribution.

A Slingshot record hit still avoids the direct record request, but it cannot avoid the PDS blob fetch. `com.atproto.sync.getBlob` may not provide browser CORS headers on every PDS; map a network `TypeError` from this request to the existing `pds-cors` error category, and do not pretend Slingshot can provide a blob fallback. Invalid blob references, wrong MIME/size declarations, missing blob responses, and invalid UTF-8 are `invalid-record` failures. The App keeps its existing protection against replacing the local editor on failed loads.

The shares manager only lists and validates record metadata. It does not fetch every schema blob while rendering the list. Opening a row re-enters the normal transactional public snapshot loader.

## Tests

Add or update deterministic tests for:

- generated lexicon acceptance of a modern text blob and rejection of an inline schema string
- record creation with a blob reference
- UTF-8 byte-size and record-size validation
- upload-before-create call ordering
- upload failure preventing record creation
- upload response validation
- missing, malformed, wrong-MIME, oversized, and invalid-UTF-8 blobs
- PDS blob CORS/network failures map to `pds-cors`
- list manager metadata parsing without schema blob downloads

## Non-goals

- preserving old inline-schema records
- adding a second snapshot collection
- implementing blob deletion or garbage-collection coordination
- caching blobs in Slingshot or adding a Prismaliser server
- changing the visual share manager beyond permission/error wording required by the new upload/read behavior
