import { describe, expect, it } from "vitest";

import {
  createAtShareUrl,
  createLegacyShareUrl,
  parseShareLocation,
  removeShareParams,
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
        `?at=${encodeURIComponent(
          "at://did:plc:hdhoaan3xa3jiuq4fg4mefid/app.bsky.feed.post/3lv4ouczo2b2a",
        )}`,
      ).kind,
    ).toBe("invalid");
  });
  it("removes share parameters while preserving other location state", () => {
    expect(
      removeShareParams(`?at=${encodeURIComponent(uri)}&code=abc&view=flow`),
    ).toBe("?view=flow");
    expect(removeShareParams("?at=one&at=two")).toBe("");
  });
});
