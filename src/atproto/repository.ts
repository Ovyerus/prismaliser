import { ok } from "@atcute/client";

import {
  MAX_SCHEMA_BLOB_BYTES,
  PRISMALISER_COLLECTION,
  SCHEMA_BLOB_MIME_TYPE,
} from "~/atproto/constants";
import { parsePrismaliserAtUri } from "~/atproto/links";
import {
  ShareRecordValidationError,
  createShareRecord,
  deriveSnapshotLabel,
  parseShareRecord,
  validateSchemaBlob,
} from "~/atproto/record";
import type {
  ConnectedSession,
  SnapshotDraft,
  SnapshotPage,
} from "~/atproto/types";
import type * as AppPrismaliserSchema from "~/lexicons/types/app/prismaliser/schema";

import type {
  ComAtprotoRepoCreateRecord,
  ComAtprotoRepoDeleteRecord,
  ComAtprotoRepoListRecords,
  ComAtprotoRepoUploadBlob,
} from "@atcute/atproto";
import type { Client } from "@atcute/client";

export interface RepositoryTransport {
  createRecord(input: {
    repo: string;
    collection: typeof PRISMALISER_COLLECTION;
    record: AppPrismaliserSchema.Main;
  }): Promise<{ uri: string; cid: string }>;
  uploadBlob(input: {
    blob: Blob;
  }): Promise<{ blob: AppPrismaliserSchema.Main["schema"] }>;
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

export const createAtcuteRepositoryTransport = (
  client: Client,
): RepositoryTransport => ({
  uploadBlob: (input): Promise<ComAtprotoRepoUploadBlob.$output> =>
    ok(
      client.post("com.atproto.repo.uploadBlob", {
        input: input.blob,
      }),
    ),
  createRecord: (input) =>
    ok(
      client.post("com.atproto.repo.createRecord", {
        input: input as ComAtprotoRepoCreateRecord.$input,
      }),
    ),
  listRecords: (input) =>
    ok(
      client.get("com.atproto.repo.listRecords", {
        params: input as ComAtprotoRepoListRecords.$params,
      }),
    ),
  async deleteRecord(input) {
    await ok(
      client.post("com.atproto.repo.deleteRecord", {
        input: input as ComAtprotoRepoDeleteRecord.$input,
      }),
    );
  },
});

export const createSnapshot = async (
  session: ConnectedSession,
  draft: SnapshotDraft,
  transport: RepositoryTransport = createAtcuteRepositoryTransport(
    session.client,
  ),
) => {
  const schemaBlob = new Blob([draft.schema], {
    type: SCHEMA_BLOB_MIME_TYPE,
  });
  if (schemaBlob.size > MAX_SCHEMA_BLOB_BYTES)
    throw new ShareRecordValidationError(
      `Schema blob exceeds ${MAX_SCHEMA_BLOB_BYTES}-byte size limit`,
    );

  const { blob } = await transport.uploadBlob({ blob: schemaBlob });
  const schema = validateSchemaBlob(blob);
  return transport.createRecord({
    repo: session.did,
    collection: PRISMALISER_COLLECTION,
    record: createShareRecord({
      name: draft.name,
      schema,
      positions: draft.positions,
    }),
  });
};

export const listSnapshots = async (
  session: ConnectedSession,
  { cursor, limit }: { cursor?: string; limit: number },
  transport: RepositoryTransport = createAtcuteRepositoryTransport(
    session.client,
  ),
): Promise<SnapshotPage> => {
  const page = await transport.listRecords({
    repo: session.did,
    collection: PRISMALISER_COLLECTION,
    ...(cursor === undefined ? {} : { cursor }),
    limit,
    reverse: true,
  });
  const snapshots: SnapshotPage["snapshots"] = [];
  let invalidCount = 0;

  for (const { uri, cid, value } of page.records)
    try {
      const record = parseShareRecord(value);
      snapshots.push({
        uri,
        cid,
        ...(record.name === undefined ? {} : { name: record.name }),
        label: deriveSnapshotLabel(record.name, record.positions),
        createdAt: record.createdAt,
        nodeIds: record.positions.map(({ id }) => id),
      });
    } catch {
      invalidCount += 1;
    }

  return {
    snapshots,
    ...(page.cursor === undefined ? {} : { cursor: page.cursor }),
    invalidCount,
  };
};

export const deleteSnapshot = async (
  session: ConnectedSession,
  uri: string,
  transport: RepositoryTransport = createAtcuteRepositoryTransport(
    session.client,
  ),
): Promise<void> => {
  const parsed = parsePrismaliserAtUri(uri);
  await transport.deleteRecord({
    repo: parsed.repo,
    collection: PRISMALISER_COLLECTION,
    rkey: parsed.rkey,
  });
};

export type { SnapshotPage } from "~/atproto/types";
