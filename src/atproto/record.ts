import { safeParse } from "@atcute/lexicons";
import { isCidLink } from "@atcute/lexicons/interfaces";

import {
  MAX_RECORD_BYTES,
  MAX_SCHEMA_BLOB_BYTES,
  PRISMA_SCHEMA_VERSION,
  SCHEMA_BLOB_MIME_TYPE,
} from "~/atproto/constants";
import type { SnapshotDraft } from "~/atproto/types";
import * as AppPrismaliserSchema from "~/lexicons/types/app/prismaliser/schema";
import type { NodePosition } from "~/util/types";

export type SchemaBlob = Extract<
  AppPrismaliserSchema.Main["schema"],
  { ref: unknown }
>;

export class ShareRecordValidationError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "ShareRecordValidationError";
  }
}

const encodedBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
export const validateSchemaBlob = (value: unknown): SchemaBlob => {
  if (!isRecord(value) || value.$type !== "blob")
    throw new ShareRecordValidationError(
      "Schema must be a modern blob reference",
    );

  if (value.mimeType !== SCHEMA_BLOB_MIME_TYPE)
    throw new ShareRecordValidationError(
      `Schema blob MIME type must be ${SCHEMA_BLOB_MIME_TYPE}`,
    );

  if (!isCidLink(value.ref))
    throw new ShareRecordValidationError(
      "Schema blob must reference a valid CID",
    );

  if (
    typeof value.size !== "number" ||
    !Number.isSafeInteger(value.size) ||
    value.size < 0 ||
    value.size > MAX_SCHEMA_BLOB_BYTES
  )
    throw new ShareRecordValidationError(
      `Schema blob size must be an integer between 0 and ${MAX_SCHEMA_BLOB_BYTES} bytes`,
    );

  return value as unknown as SchemaBlob;
};

export const normalisePositions = (positions: readonly NodePosition[]) =>
  positions
    .map(({ id, x, y }) => ({ id, x: Math.round(x), y: Math.round(y) }))
    .sort((left, right) => left.id.localeCompare(right.id));

export const parseShareRecord = (value: unknown): AppPrismaliserSchema.Main => {
  const result = safeParse(AppPrismaliserSchema.mainSchema, value);
  if (!result.ok) throw new ShareRecordValidationError(result.message);
  validateSchemaBlob(result.value.schema);
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
}: Omit<SnapshotDraft, "schema"> & {
  schema: SchemaBlob;
  createdAt?: Date;
}) =>
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
