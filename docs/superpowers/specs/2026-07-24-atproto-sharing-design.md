# AT Protocol Sharing Design

**Status:** Approved product and technical design  
**Date:** 2026-07-24

## Summary

Prismaliser will let people connect an AT Protocol account, publish an immutable
snapshot of a Prisma schema and its current node positions to their own AT
repository, copy a durable Prismaliser link to that record, and manage snapshots
they have published.

Prismaliser remains a static, client-only SPA. OAuth and repository writes run
in the browser with the atcute library family. Public record reads use Slingshot
first and the author's current PDS as a fallback. Prismaliser will not operate
an account system, token backend, record proxy, or appview.

Existing `?code=` links will continue to open. Creating a schema-only `?code=`
link will remain available as a secondary, anonymous action so sharing still
works without an AT Protocol account.

## Goals

- Connect any OAuth-capable AT Protocol account without collecting a password or
  app password.
- Publish a public, immutable schema snapshot containing the current graph
  layout.
- Open a published snapshot through a static-host-compatible Prismaliser URL.
- Preserve current schema-in-the-URL links and retain anonymous creation as a
  secondary action.
- Let the connected record owner find, copy, open, and delete their snapshots.
- Keep hosted and self-hosted Prismaliser deployments client-only.
- Make the public nature of repository records and the OAuth trust boundary
  unambiguous.

## Non-goals

- Prismaliser accounts or a Prismaliser-owned user database.
- A Prismaliser appview, relay consumer, record proxy, or backend OAuth client.
- Mutable/shared documents, collaborative editing, autosave, or record updates.
- Discovery, feeds, comments, likes, or other social features.
- Private/encrypted schema sharing.
- Renaming a published snapshot.
- Bundling historical Prisma parsers for old snapshots.
- Proving the cryptographic authenticity of Slingshot's JSON response in the
  first release.

## Decisions

### Snapshot lifecycle

Every AT Protocol share is a new immutable snapshot with a fresh TID record key.
Editing an opened snapshot changes only the local Prismaliser workspace. Sharing
those edits creates a new record and link. Prismaliser never calls `putRecord`
for this collection.

Deletion removes the canonical repository record and breaks its link. The UI
explains that copies may remain in relays or caches.

### Anonymous sharing and link compatibility

The current schema-only format remains supported:

```text
https://prismaliser.app/?code=<url-safe-base64-schema>
```

The primary Share action recommends an AT Protocol snapshot. A secondary action
inside the same dialog creates the existing schema-only link without login or
publication. This secondary link does not preserve node positions.

### Public record resolution

Prismaliser uses this read order:

1. standard unauthenticated `com.atproto.repo.getRecord` through Slingshot;
2. on Slingshot failure or not-found, resolve the author's DID to the current
   PDS and call the same endpoint directly;
3. if both fail, show a specific non-destructive error.

Slingshot provides lower latency, eager firehose caching, upstream fetches on
cache misses, and browser CORS. Direct PDS access prevents Slingshot becoming
the sole path to user data. AT Protocol only encourages rather than requires PDS
CORS, so direct access cannot rescue every Slingshot outage.

Prismaliser will not add a first-party resolver or appview unless measured
production reliability later shows that both paths are insufficient.

## User experience

### Account entry

The nav gains **Connect account**. The dialog follows the approved
npmx.dev-inspired hierarchy:

- heading: **Connect an AT Protocol account**;
- supporting copy: **Use your account to publish and manage shared diagrams.**;
- a Handle field with `alice.bsky.social` as its example;
- helper copy: **If you use Bluesky, this is your Bluesky handle.**;
- a collapsed native `<details>` labelled **What is an Atmosphere account?**;
- primary action: **Continue to your provider**;
- alternate action: **Connect with Bluesky**.

There is no **Create an account** action. Prismaliser is not a PDS or account
provider and must not imply otherwise.

The details copy explains:

- Prismaliser uses AT Protocol so published diagrams live in the user's public
  repository, not in a Prismaliser account;
- the same account works across compatible applications;
- a Bluesky account is already an Atmosphere account;
- Prismaliser never sees the password because the account provider performs
  authorisation;
- shared schemas are public and must be checked for passwords, connection
  strings, and other secrets.

After connection, the nav displays the verified handle, falling back to the DID
when handle resolution is unavailable. Its menu contains **My shares** and
**Disconnect**.

### Share dialog

The current **Copy link** button becomes **Share**. The dialog contains:

- an optional snapshot name;
- concise copy that the snapshot includes the current schema and node positions;
- a visible public-record and secrets warning;
- primary action: **Publish and copy link**;
- secondary action: **Copy a schema-only link without publishing**.

If the primary action is selected while logged out, Prismaliser saves the
pending name, schema, and positions in `sessionStorage`, starts OAuth, then
restores the Share dialog after the callback. Successful connection does not
publish automatically; the user must press **Publish and copy link**.

Publishing creates the record, copies its canonical Prismaliser URL, and makes
the new record the current snapshot baseline. If clipboard access fails after a
successful publication, the dialog shows a selected text link for manual copying
rather than reporting publication failure.

### Opening a snapshot

The canonical link is query-based so it works on plain static hosts:

```text
https://prismaliser.app/?at=at%3A%2F%2Fdid%3Aplc%3A...%2Fapp.prismaliser.schema%2F...
```

A valid snapshot opens as an immediately editable local copy. A compact bar
above the workspace shows:

- the explicit snapshot name, or a label derived from the first few non-virtual
  node IDs;
- `by @handle`, falling back to the DID;
- publication date;
- **Copy original link**.

Changing schema text or node positions adds **Modified locally**. Returning
exactly to the loaded schema and integer-normalised positions clears it. Edits
never mutate the source record.

### My shares

**My shares** opens a dedicated modal listing `app.prismaliser.schema` records
from the connected account's PDS, newest first. It includes:

- cursor pagination;
- client-side search across loaded names and node IDs;
- **Open**;
- **Copy**;
- **Delete**.

There is no update, rename, or mutable-document path. Deletion requires a named
confirmation and explains the cache/relay limitation.

Deleting the currently open snapshot leaves its schema and positions loaded as a
local copy. The attribution bar changes to **Deleted from repository** while
retaining the original URI for clarity.

## Lexicon

### Record collection

The collection NSID is:

```text
app.prismaliser.schema
```

The Lexicon uses `tid` keys and defines one record plus a local `position`
object definition.

Conceptual generated type:

```ts
interface PrismaliserSchemaRecord {
  $type: "app.prismaliser.schema";
  name?: string;
  schema: string;
  positions: NodePosition[];
  prismaVersion: string;
  createdAt: string;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
}
```

### Constraints

- `name`
  - optional;
  - maximum 80 graphemes and 160 UTF-8 bytes.
- `schema`
  - required Unicode string;
  - maximum 500,000 UTF-8 bytes;
  - stored without compression or another encoding.
- `positions`
  - required and may be empty;
  - maximum 5,000 entries;
  - each entry requires `id`, `x`, and `y`;
  - `id` has a conservative byte limit;
  - coordinates are rounded integers because the AT data model does not support
    floats;
  - coordinates have generous finite minimum and maximum bounds.
- `prismaVersion`
  - required bounded string containing the Prisma schema/toolchain version used
    when publishing.
- `createdAt`
  - required AT Protocol `datetime`.

Before a write, Prismaliser also enforces a conservative 750,000-byte ceiling on
the JSON-serialised complete record. Lexicon field constraints cannot express a
total object bound.

### Validation and evolution

Readers:

- require the exact `$type`;
- validate required fields, formats, UTF-8 byte lengths, array bounds, and total
  size before invoking Prisma WASM;
- reject duplicate position IDs and non-integer coordinates;
- accept unknown additional fields for additive Lexicon evolution;
- ignore positions for node IDs absent from the generated graph;
- leave generated nodes without a saved position at the existing default.

There is no content-version field. The Lexicon is the additive data contract and
the first release has only one payload encoding. `prismaVersion` is diagnostic
metadata, not a request to load another parser.

No blobs, record references, view definitions, permission set, or custom XRPC
methods are needed. Standard repository APIs provide create, list, get, and
delete.

### Source, generated bindings, and publication

The source Lexicon JSON lives under `lexicons/`. `@atcute/lex-cli` reads
`lexicons/**/*.json` through `lex.config.ts` and generates application bindings
under `src/lexicons/`. `@atcute/atproto` supplies the standard `com.atproto.*`
definitions.

The generated output is checked in and verified against source in CI.
Application code uses generated record types and validators rather than
handwritten duplicates.

Lexicon authority is published through AT Protocol, not by serving the JSON at
an arbitrary web path:

1. create a dedicated project-controlled AT account/repository for Prismaliser's
   lexicon authority;
2. publish the schema as a `com.atproto.lexicon.schema` record (the official
   `goat lex publish` workflow is acceptable);
3. configure `_lexicon.prismaliser.app` DNS TXT with `did=<authority DID>`;
4. resolve `app.prismaliser.schema` through that DNS-authorised repository.

The concrete DID is an operational value produced when the dedicated authority
account is created; it is not tied to a personal account.

## Client architecture

### Libraries

AT Protocol support uses the atcute family:

- `@atcute/oauth-browser-client` for public browser OAuth;
- `@atcute/client` for XRPC;
- `@atcute/identity-resolver` for handle, PLC DID, and Web DID resolution;
- `@atcute/atproto` for standard repository definitions;
- `@atcute/lexicons` and generated Prismaliser bindings for validation;
- `@atcute/lex-cli` as development tooling.

The design intentionally does not use the broad official `@atproto/api` client.

### Module boundaries

AT Protocol code is separated into focused browser modules:

- OAuth configuration, callback finalisation, resume, and disconnect;
- identity resolution;
- repository create/list/delete/read operations;
- Prismaliser share-record validation and conversion;
- canonical share-link parsing and creation.

`App` remains the coordinator rather than introducing a global store. It owns
active account presentation, loaded snapshot metadata, pending share state, and
dialog state.

`FlowView` remains the source of truth for React Flow nodes and edges. It gains
a narrow snapshot boundary which:

- accepts saved positions when a record loads;
- exposes current `{id, x, y}` values when sharing;
- reports whether positions differ from the loaded baseline.

High-frequency graph state is not lifted through `App`.

### OAuth session and permission

The production app is a public OAuth client. It requests only:

```text
atproto repo:app.prismaliser.schema?action=create&action=delete
```

Public reads and listing do not require a repository write permission. atcute
owns persisted OAuth transaction and session material. Prismaliser stores only
the active account DID required to request session resumption.

The OAuth callback returns to the SPA root. atcute callback parameters in the
URL fragment are finalised once and immediately scrubbed. Pending share data
exists only for the redirect round-trip and is removed after restoration or
cancellation. Old pending drafts expire.

An expired session during create or delete reopens the connection flow and
preserves the intended action. Mutations are never retried invisibly.

### Startup ordering

Startup is one coordinated sequence:

1. configure atcute OAuth;
2. finalise and scrub an OAuth callback when present;
3. resume the active DID when possible;
4. inspect share query parameters;
5. load the selected share or the persisted local workspace.

URL rules:

- exactly one `at` parameter loads an AT snapshot;
- exactly one `code` parameter invokes the existing decoder;
- both parameters, duplicate parameters, or malformed values produce an
  invalid-link state and leave the local draft untouched;
- no share parameter loads the local schema as today.

Asynchronous record loads use cancellation or generation guards so a stale
response cannot overwrite a newer navigation.

### Record loading transaction

A public record is staged before editor state changes:

1. parse the URI and require the `app.prismaliser.schema` collection;
2. fetch through Slingshot, then direct PDS fallback;
3. validate type, fields, counts, and size;
4. parse the schema with Prisma WASM;
5. generate nodes and edges;
6. apply positions for matching node IDs;
7. commit schema, graph, and attribution metadata together.

Until every step succeeds, the current local workspace remains intact.

Slingshot's `com.atproto.repo.getRecord` JSON is not cryptographic proof of
repository authenticity. Prismaliser treats the response as untrusted inert data
and applies the same validation used for a direct PDS response.

## OAuth deployment and self-hosting

The browser derives its client ID from the current origin:

```text
<origin>/oauth-client-metadata.json
```

The redirect URI is the deployment root. Metadata declares a public web client,
refresh tokens, DPoP-bound access tokens, and the narrow Prismaliser repository
scope.

- `prismaliser.app` ships exact matching JSON at that path.
- Docker deployments set `PRISMALISER_ORIGIN` to their public HTTPS origin,
  without a trailing slash. Caddy uses config-time environment substitution and
  a JSON `respond` route to serve matching origin-specific metadata.
- Plain static-host operators provide equivalent JSON at the same path.
- The app validates that metadata is present and self-consistent before offering
  connection.
- If metadata is absent or invalid, Connect is disabled with an explanation;
  editing and schema-only links continue to work.
- Vite development uses atcute's special `http://localhost?...` client ID with a
  fixed `127.0.0.1` host and port for the redirect.

This requirement does not introduce an application server. Caddy serves one
origin-derived metadata document alongside static assets.

## Errors and recovery

User-facing error categories are:

- **Record not found or deleted:** both read paths definitively return not
  found.
- **Temporarily unreachable:** both paths fail through transport or service
  errors; offer Retry.
- **PDS browser restriction:** Slingshot is unavailable and a browser CORS
  failure blocks direct access; explain that the record may still exist.
- **Invalid Prismaliser record:** wrong type, malformed fields, duplicate
  positions, or exceeded bounds.
- **Schema no longer parses:** the record is structurally valid but the current
  Prisma parser rejects it; show diagnostics without loading it.
- **Connection denied or expired:** return to Connect without losing the pending
  share.
- **Publish or delete failed:** preserve dialog/manager state and require an
  explicit retry.
- **Clipboard unavailable:** show the successfully created link for manual copy.

Unexpected failures are logged once without record content and shown as a
generic failure with Retry only where repetition is safe.

Disconnecting removes connected-account presentation and authenticated actions.
It does not close or alter an already loaded public snapshot.

## Security and privacy

- Prismaliser never asks for or receives an account password or app password.
- atcute handles OAuth state, PKCE, DPoP, token refresh, and session
  persistence.
- Record payloads are untrusted and bounded before parsing.
- Record values are never rendered as HTML or evaluated.
- URI parsing allowlists the exact collection and rejects unsafe or ambiguous
  input.
- Schema contents, record bodies, handles, DIDs, OAuth errors, and AT URIs are
  excluded from custom analytics and error logs.
- Umami is not injected on OAuth callback loads before callback parameters are
  scrubbed.
- Umami is also skipped on legacy `?code=` loads because those URLs may contain
  secret-bearing schema text.
- Public-data warnings appear before both authorisation and publication.
- Deletion copy does not promise erasure from relays or caches.

## Accessibility

Dialogs use native `<dialog>` semantics where supported:

- labelled heading and description;
- focus moves into the dialog and returns to the invoking control;
- Escape and a visible close button both work;
- no interaction depends only on clicking outside;
- handle and name forms submit with Enter;
- loading states retain an accessible action label and announce progress.

The account menu follows keyboard button/menu behaviour. The account explanation
uses native `<details>/<summary>`. Public, modified, deleted, and error states
use explicit text in addition to colour. Destructive confirmation includes the
snapshot label.

## Verification

### Automated contracts

Tests cover observable behaviour:

- existing `?code=` links still decode and new schema-only links round-trip;
- AT share URLs reject wrong collections, malformed URIs, duplicates, and
  ambiguous `at` plus `code`;
- generated Lexicon validation accepts canonical records and rejects every
  defined boundary;
- name/schema limits count UTF-8 bytes rather than JavaScript code units;
- positions round, restore by ID, ignore unknown IDs, reject duplicates, and
  drive modified-state comparison;
- Slingshot success avoids direct resolution, a recoverable Slingshot failure
  invokes direct PDS, and dual failures map to visible categories;
- a structurally valid record with an invalid Prisma schema leaves current state
  untouched;
- pending share restoration still requires explicit publication;
- create/list/delete update manager and current-snapshot presentation correctly;
- OAuth callback and legacy-code page loads do not inject Umami;
- Lexicon source and generated atcute bindings remain in sync.

Network calls are mocked for deterministic automated tests. Existing parser
integration tests continue to use real Prisma WASM where parser behaviour is the
contract.

### Browser acceptance

Exercise a production build in a real browser with an OAuth-capable test
account:

1. connect by handle and through the Bluesky shortcut;
2. deny once, then retry without losing the diagram;
3. publish a named snapshot after moving nodes;
4. open its copied link signed out and verify schema and positions;
5. edit schema and move a node; verify **Modified locally**;
6. verify My shares open, copy, search, pagination, and delete;
7. force Slingshot failure and verify direct-PDS fallback;
8. force both read paths to fail and verify non-destructive retry;
9. delete the open snapshot and verify its local-copy/deleted presentation;
10. revisit the deleted link and verify not-found;
11. open a pre-change `?code=` link and create a new schema-only link;
12. disconnect and reconnect;
13. complete the dialog, details, account menu, sharing, and deletion flows by
    keyboard;
14. verify hosted metadata and a separately configured Docker origin.

The final repository verification remains `yarn lint`, `yarn test`,
`yarn build`, followed by the production-browser smoke scenarios above.

## Known risks and explicit trade-offs

- The hosted Slingshot instance describes itself as v0/pre-release and may
  restart or reset caches. Direct PDS fallback and differentiated retry errors
  mitigate but do not eliminate this availability risk.
- The current atcute browser OAuth client describes itself as a minimal
  implementation with limited testing and stores exportable DPoP key material
  rather than using non-exportable IndexedDB keys. Implementation must pin and
  review the chosen release, exercise the full OAuth acceptance flow, and track
  upstream improvements. The user-selected atcute constraint remains; replacing
  it with another SDK requires a design decision rather than an implicit
  fallback.
- Prismaliser will not request broad `transition:generic` access when a provider
  does not support the granular repository permission. It reports that the
  provider cannot grant the required narrow permission.
- PDS record-size policies are implementation-specific. Prismaliser's
  conservative local ceiling reduces failures but cannot guarantee that every
  provider accepts every locally valid maximum-size record.
- A self-hosted deployment without valid same-origin OAuth metadata cannot
  connect accounts. The anonymous schema-only share path remains available.

## Primary references

- [AT Protocol OAuth specification](https://atproto.com/specs/oauth)
- [AT Protocol permission specification](https://atproto.com/specs/permission)
- [AT Protocol Lexicon specification](https://atproto.com/specs/lexicon)
- [Publishing Lexicons](https://atproto.com/guides/publishing-lexicons)
- [OAuth browser-client implementation guide](https://docs.bsky.app/docs/advanced-guides/oauth-client)
- [Slingshot API and operational status](https://slingshot.microcosm.blue/)
- [atcute OAuth browser client](https://github.com/mary-ext/atcute/tree/trunk/packages/oauth/browser-client)
- [atcute Lexicon CLI](https://github.com/mary-ext/atcute/tree/trunk/packages/lexicons/lex-cli)
- [Caddy `respond` directive](https://caddyserver.com/docs/caddyfile/directives/respond)
