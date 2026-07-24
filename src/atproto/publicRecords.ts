// eslint-disable-next-line import/no-unassigned-import -- Registers standard AT Protocol XRPC definitions.
import type {} from "@atcute/atproto";
import {
  Client,
  ClientValidationError,
  simpleFetchHandler,
} from "@atcute/client";
import { isCid, isDid, isHandle } from "@atcute/lexicons/syntax";

import {
  MAX_SCHEMA_BLOB_BYTES,
  SCHEMA_BLOB_MIME_TYPE,
  SLINGSHOT_ORIGIN,
} from "~/atproto/constants";
import { actorResolver } from "~/atproto/identity";
import { parsePrismaliserAtUri } from "~/atproto/links";
import { parseShareRecord, validateSchemaBlob } from "~/atproto/record";
import type { LoadedSnapshot } from "~/atproto/types";
import type * as AppPrismaliserSchema from "~/lexicons/types/app/prismaliser/schema";

interface RecordEnvelope {
  uri: string;
  cid: string;
  value: unknown;
}

interface VerifiedActor {
  did: string;
  handle?: string;
  pds: string;
}

export interface PublicRecordDependencies {
  slingshot(uri: string, signal?: AbortSignal): Promise<RecordEnvelope>;
  direct(
    pds: string,
    uri: string,
    signal?: AbortSignal,
  ): Promise<RecordEnvelope>;
  blob(
    pds: string,
    did: string,
    cid: string,
    signal?: AbortSignal,
  ): Promise<{ bytes: Uint8Array; contentType: string | null }>;
  resolveActor: typeof actorResolver.resolve;
}

export interface PublicRecordLoadOptions extends Partial<PublicRecordDependencies> {
  signal?: AbortSignal;
}

export class PublicRecordLoadError extends Error {
  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility -- Public error contract.
  public constructor(
    readonly code: "invalid-record" | "not-found" | "pds-cors" | "unreachable",
    message: string = code,
  ) {
    super(message);
    this.name = "PublicRecordLoadError";
  }
}

const invalidRecord = (message = "Invalid Prismaliser record") =>
  new PublicRecordLoadError("invalid-record", message);

const UNVERIFIED_HANDLE = "handle.invalid";

interface ValidatedRecordEnvelope {
  uri: string;
  cid: string;
  value: AppPrismaliserSchema.Main;
}

const validateEnvelope = (
  value: unknown,
  requestedUri: string,
): ValidatedRecordEnvelope => {
  if (typeof value !== "object" || value === null)
    throw invalidRecord("Invalid record response");

  const envelope = value as Partial<RecordEnvelope>;
  if (
    typeof envelope.uri !== "string" ||
    envelope.uri !== requestedUri ||
    typeof envelope.cid !== "string" ||
    !isCid(envelope.cid) ||
    !("value" in envelope)
  )
    throw invalidRecord("Invalid record response");

  try {
    return {
      uri: envelope.uri,
      cid: envelope.cid,
      value: parseShareRecord(envelope.value),
    };
  } catch (error) {
    if (error instanceof PublicRecordLoadError) throw error;
    throw invalidRecord(
      error instanceof Error ? error.message : "Invalid Prismaliser record",
    );
  }
};

const toLoadedSnapshot = (
  record: ValidatedRecordEnvelope,
  schema: string,
  authorDid: string,
  authorHandle?: string,
): LoadedSnapshot => {
  const { uri, cid, value } = record;

  return {
    uri,
    cid,
    ...(value.name === undefined ? {} : { name: value.name }),
    schema,
    positions: value.positions,
    prismaVersion: value.prismaVersion,
    createdAt: value.createdAt,
    authorDid,
    ...(authorHandle === undefined ? {} : { authorHandle }),
  };
};

const normaliseRequestError = (error: unknown) => {
  if (error instanceof PublicRecordLoadError) return error;
  if (error instanceof ClientValidationError)
    return invalidRecord(error.message);
  return new PublicRecordLoadError("unreachable");
};

const requestRecord = async (
  service: string,
  uri: string,
  signal: AbortSignal | undefined,
  direct: boolean,
): Promise<RecordEnvelope> => {
  const parsed = parsePrismaliserAtUri(uri);
  const fetchAtBoundary: typeof globalThis.fetch = async (input, init) => {
    try {
      return await globalThis.fetch(input, init);
    } catch (error) {
      if (direct && error instanceof TypeError)
        throw new PublicRecordLoadError("pds-cors");
      throw error;
    }
  };
  const client = new Client({
    handler: simpleFetchHandler({ fetch: fetchAtBoundary, service }),
  });

  try {
    const response = await client.get("com.atproto.repo.getRecord", {
      params: {
        repo: parsed.repo,
        collection: parsed.collection,
        rkey: parsed.rkey,
      },
      signal,
    });

    if (!response.ok) {
      if (response.data.error === "RecordNotFound")
        throw new PublicRecordLoadError("not-found");
      throw new PublicRecordLoadError("unreachable");
    }

    return validateEnvelope(response.data, uri);
  } catch (error) {
    throw normaliseRequestError(error);
  }
};
const normaliseBlobRequestError = (error: unknown) => {
  if (error instanceof PublicRecordLoadError) return error;
  if (error instanceof ClientValidationError)
    return invalidRecord(error.message);
  if (error instanceof TypeError) return new PublicRecordLoadError("pds-cors");
  return new PublicRecordLoadError("unreachable");
};

const requestBlob = async (
  pds: string,
  did: string,
  cid: string,
  signal: AbortSignal | undefined,
): Promise<{ bytes: Uint8Array; contentType: string | null }> => {
  if (!isDid(did)) throw invalidRecord("Invalid author DID");
  const fetchAtBoundary: typeof globalThis.fetch = async (input, init) => {
    try {
      return await globalThis.fetch(input, init);
    } catch (error) {
      if (error instanceof TypeError)
        throw new PublicRecordLoadError("pds-cors");
      throw error;
    }
  };
  const client = new Client({
    handler: simpleFetchHandler({ fetch: fetchAtBoundary, service: pds }),
  });

  try {
    const response = await client.get("com.atproto.sync.getBlob", {
      params: { did, cid },
      as: "bytes",
      signal,
    });

    if (!response.ok) {
      if (response.status === 404 || response.data.error === "BlobNotFound")
        throw invalidRecord("Schema blob not found");
      throw new PublicRecordLoadError("unreachable");
    }

    if (!(response.data instanceof Uint8Array))
      throw invalidRecord("Invalid schema blob response");
    return {
      bytes: response.data,
      contentType: response.headers.get("content-type"),
    };
  } catch (error) {
    throw normaliseBlobRequestError(error);
  }
};

const defaultSlingshot: PublicRecordDependencies["slingshot"] = (uri, signal) =>
  requestRecord(SLINGSHOT_ORIGIN, uri, signal, false);
const defaultDirect: PublicRecordDependencies["direct"] = (pds, uri, signal) =>
  requestRecord(pds, uri, signal, true);
const defaultBlob: PublicRecordDependencies["blob"] = (pds, did, cid, signal) =>
  requestBlob(pds, did, cid, signal);
const defaultResolveActor: PublicRecordDependencies["resolveActor"] = (
  actor,
  options,
) => actorResolver.resolve(actor, options);

const validateResolvedActor = (
  value: unknown,
  expectedDid: string,
): VerifiedActor => {
  if (typeof value !== "object" || value === null)
    throw new PublicRecordLoadError("unreachable");

  const actor = value as { did?: unknown; handle?: unknown; pds?: unknown };
  const handle =
    actor.handle === undefined || actor.handle === UNVERIFIED_HANDLE
      ? undefined
      : isHandle(actor.handle)
        ? actor.handle
        : null;
  if (
    !isDid(actor.did) ||
    actor.did !== expectedDid ||
    handle === null ||
    typeof actor.pds !== "string"
  )
    throw new PublicRecordLoadError("unreachable");

  try {
    const pds = new URL(actor.pds);
    if (pds.protocol !== "https:" && pds.protocol !== "http:")
      throw new TypeError("Unsupported PDS protocol");
  } catch {
    throw new PublicRecordLoadError("unreachable");
  }

  return {
    did: actor.did,
    ...(handle === undefined ? {} : { handle }),
    pds: actor.pds,
  };
};

const loadValidatedRecord = async (
  record: ValidatedRecordEnvelope,
  actor: VerifiedActor,
  blob: PublicRecordDependencies["blob"],
  signal: AbortSignal | undefined,
): Promise<LoadedSnapshot> => {
  const schemaBlob = validateSchemaBlob(record.value.schema);

  let response: unknown;
  try {
    response = await blob(actor.pds, actor.did, schemaBlob.ref.$link, signal);
  } catch (error) {
    if (error instanceof TypeError) throw new PublicRecordLoadError("pds-cors");
    throw normaliseRequestError(error);
  }

  if (typeof response !== "object" || response === null)
    throw invalidRecord("Invalid schema blob response");

  const result = response as {
    bytes?: unknown;
    contentType?: unknown;
  };
  if (
    !(result.bytes instanceof Uint8Array) ||
    typeof result.contentType !== "string" ||
    result.contentType.split(";", 1)[0]!.trim().toLowerCase() !==
      SCHEMA_BLOB_MIME_TYPE ||
    result.bytes.byteLength > MAX_SCHEMA_BLOB_BYTES
  )
    throw invalidRecord("Invalid schema blob response");

  let schema: string;
  try {
    schema = new TextDecoder("utf-8", { fatal: true }).decode(result.bytes);
  } catch {
    throw invalidRecord("Schema blob is not valid UTF-8");
  }

  return toLoadedSnapshot(record, schema, actor.did, actor.handle);
};

const parseSnapshotUri = (uri: string) => {
  try {
    const parsed = parsePrismaliserAtUri(uri);
    if (!isDid(parsed.repo))
      throw new SyntaxError("Snapshot URI must use a DID");
    return parsed;
  } catch (error) {
    throw invalidRecord(error instanceof Error ? error.message : undefined);
  }
};

export const loadPublicRecord = async (
  uri: string,
  {
    signal,
    slingshot = defaultSlingshot,
    direct = defaultDirect,
    resolveActor = defaultResolveActor,
    blob = defaultBlob,
  }: PublicRecordLoadOptions = {},
): Promise<LoadedSnapshot> => {
  const parsed = parseSnapshotUri(uri);

  let record: ValidatedRecordEnvelope | undefined;
  try {
    record = validateEnvelope(await slingshot(uri, signal), uri);
  } catch {
    // Any unavailable, missing, or invalid cache response gets a direct attempt.
  }

  let actor: VerifiedActor;
  try {
    actor = validateResolvedActor(
      await resolveActor(parsed.repo, { signal }),
      parsed.repo,
    );
  } catch (error) {
    throw normaliseRequestError(error);
  }

  if (record !== undefined)
    return loadValidatedRecord(record, actor, blob, signal);

  try {
    const directRecord = validateEnvelope(
      await direct(actor.pds, uri, signal),
      uri,
    );
    return await loadValidatedRecord(directRecord, actor, blob, signal);
  } catch (error) {
    throw normaliseRequestError(error);
  }
};
