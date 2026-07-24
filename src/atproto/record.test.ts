import { describe, expect, it } from "vitest";

import {
  createShareRecord,
  parseShareRecord,
  ShareRecordValidationError,
} from "~/atproto/record";

const validSchemaBlob = {
  $type: "blob" as const,
  mimeType: "text/plain",
  ref: {
    $link: "bafkreigh2akiscaildcqpo6n3v6r5q6a6bq4q6qk7u2f5m2a3r6b4d5c6e",
  },
  size: 28,
};

const valid = {
  $type: "app.prismaliser.schema",
  schema: validSchemaBlob,
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

  it("accepts a text schema blob and rejects an inline schema", () => {
    expect(
      parseShareRecord({ ...valid, schema: validSchemaBlob }).schema,
    ).toEqual(validSchemaBlob);
    expect(() =>
      parseShareRecord({ ...valid, schema: "model User { id Int @id }" }),
    ).toThrow(ShareRecordValidationError);
  });

  it("accepts additive unknown fields", () => {
    expect(parseShareRecord({ ...valid, future: true }).schema).toEqual(
      validSchemaBlob,
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

  it.each([
    ["negative size", { ...validSchemaBlob, size: -1 }],
    ["missing CID link", { ...validSchemaBlob, ref: {} }],
    ["invalid CID link", { ...validSchemaBlob, ref: { $link: "not-a-cid" } }],
  ])("rejects a schema blob with %s", (_, schema) => {
    expect(() => parseShareRecord({ ...valid, schema })).toThrow(
      ShareRecordValidationError,
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
