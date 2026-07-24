import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadPublicRecord,
  PublicRecordLoadError,
} from "~/atproto/publicRecords";

const uri =
  "at://did:plc:hdhoaan3xa3jiuq4fg4mefid/app.prismaliser.schema/3lv4ouczo2b2a";
const author = {
  did: "did:plc:hdhoaan3xa3jiuq4fg4mefid",
  handle: "alice.example",
  pds: "https://pds.example",
};
const validSchemaBlob = {
  $type: "blob" as const,
  mimeType: "text/plain",
  ref: {
    $link: "bafyreialv3mzvvxaoyrfrwoer3xmabbmdchvrbyhayd7bga47qjbycy74e",
  },
  size: 25,
};
const envelope = {
  uri,
  cid: "bafyreialv3mzvvxaoyrfrwoer3xmabbmdchvrbyhayd7bga47qjbycy74e",
  value: {
    $type: "app.prismaliser.schema",
    schema: validSchemaBlob,
    positions: [{ id: "User", x: 1, y: 2 }],
    prismaVersion: "7.9.0",
    createdAt: "2026-07-24T12:00:00.000Z",
  },
};

describe("public record loading", () => {
  it("loads schema text from the author's PDS after a Slingshot record hit", async () => {
    const blob = vi.fn().mockResolvedValue({
      bytes: new TextEncoder().encode("model User { id Int @id }"),
      contentType: "text/plain",
    });
    const resolveActor = vi.fn().mockResolvedValue(author);
    const direct = vi.fn();

    const loaded = await loadPublicRecord(uri, {
      slingshot: vi.fn().mockResolvedValue(envelope),
      direct,
      resolveActor,
      blob,
    });
    expect(resolveActor).toHaveBeenCalledWith(author.did, {
      signal: undefined,
    });

    expect(blob).toHaveBeenCalledWith(
      author.pds,
      author.did,
      validSchemaBlob.ref.$link,
      undefined,
    );
    expect(loaded.schema).toBe("model User { id Int @id }");
    expect(loaded.authorDid).toBe(author.did);
    expect(loaded.authorHandle).toBe(author.handle);
    expect(direct).not.toHaveBeenCalled();
  });

  it("uses direct record and blob fallback after Slingshot failure", async () => {
    const slingshot = vi.fn().mockRejectedValue(new TypeError("offline"));
    const direct = vi.fn().mockResolvedValue(envelope);
    const resolveActor = vi.fn().mockResolvedValue(author);
    const blob = vi.fn().mockResolvedValue({
      bytes: new TextEncoder().encode("model User { id Int @id }"),
      contentType: "text/plain",
    });

    const loaded = await loadPublicRecord(uri, {
      slingshot,
      direct,
      resolveActor,
      blob,
    });

    expect(slingshot).toHaveBeenCalledWith(uri, undefined);
    expect(resolveActor).toHaveBeenCalledWith(author.did, {
      signal: undefined,
    });
    expect(direct).toHaveBeenCalledWith(author.pds, uri, undefined);
    expect(blob).toHaveBeenCalledWith(
      author.pds,
      author.did,
      validSchemaBlob.ref.$link,
      undefined,
    );
    expect(loaded.schema).toBe("model User { id Int @id }");
    expect(loaded).toMatchObject({
      authorDid: author.did,
      authorHandle: author.handle,
    });
    expect(slingshot.mock.invocationCallOrder[0]).toBeLessThan(
      resolveActor.mock.invocationCallOrder[0]!,
    );
    expect(resolveActor.mock.invocationCallOrder[0]).toBeLessThan(
      direct.mock.invocationCallOrder[0]!,
    );
    expect(direct.mock.invocationCallOrder[0]).toBeLessThan(
      blob.mock.invocationCallOrder[0]!,
    );
  });

  it.each([
    ["an absent handle", { did: author.did, pds: author.pds }],
    ["the unverified handle sentinel", { ...author, handle: "handle.invalid" }],
  ])("omits %s while preserving DID/PDS fallback", async (_, resolvedActor) => {
    const direct = vi.fn().mockResolvedValue(envelope);
    const blob = vi.fn().mockResolvedValue({
      bytes: new TextEncoder().encode("model User { id Int @id }"),
      contentType: "text/plain",
    });

    const loaded = await loadPublicRecord(uri, {
      slingshot: vi.fn().mockRejectedValue(new TypeError("offline")),
      direct,
      resolveActor: vi.fn().mockResolvedValue(resolvedActor),
      blob,
    });

    expect(direct).toHaveBeenCalledWith(author.pds, uri, undefined);
    expect(loaded.authorDid).toBe(author.did);
    expect(loaded).not.toHaveProperty("authorHandle");
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
        resolveActor: vi.fn().mockResolvedValue(author),
      }),
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("maps a direct fetch rejection to pds-cors", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetch);

    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockRejectedValue(new TypeError("offline")),
        resolveActor: vi.fn().mockResolvedValue(author),
      }),
    ).rejects.toMatchObject({ code: "pds-cors" });

    expect(fetch).toHaveBeenCalledOnce();
  });

  it("maps a reachable non-XRPC response to unreachable instead of pds-cors", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response("not json", {
        headers: { "content-type": "text/html" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockRejectedValue(new TypeError("offline")),
        resolveActor: vi.fn().mockResolvedValue(author),
      }),
    ).rejects.toMatchObject({ code: "unreachable" });

    expect(fetch).toHaveBeenCalledOnce();
  });

  it("maps actor resolution failure to unreachable without trying a direct PDS", async () => {
    const direct = vi.fn();

    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockRejectedValue(new TypeError("offline")),
        direct,
        resolveActor: vi.fn().mockRejectedValue(new TypeError("offline")),
      }),
    ).rejects.toMatchObject({ code: "unreachable" });

    expect(direct).not.toHaveBeenCalled();
  });

  it("falls back when Slingshot returns an invalid record", async () => {
    const direct = vi.fn().mockResolvedValue(envelope);
    const blob = vi.fn().mockResolvedValue({
      bytes: new TextEncoder().encode("model User { id Int @id }"),
      contentType: "text/plain",
    });

    const loaded = await loadPublicRecord(uri, {
      slingshot: vi.fn().mockResolvedValue({
        ...envelope,
        value: { ...envelope.value, positions: [{ id: "User", x: 1.5, y: 2 }] },
      }),
      direct,
      resolveActor: vi.fn().mockResolvedValue(author),
      blob,
    });

    expect(direct).toHaveBeenCalledOnce();
    expect(loaded.authorHandle).toBe(author.handle);
  });

  it("maps an invalid direct record to invalid-record", async () => {
    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockRejectedValue(new TypeError("offline")),
        direct: vi.fn().mockResolvedValue({
          ...envelope,
          value: { ...envelope.value, $type: "example.invalid" },
        }),
        resolveActor: vi.fn().mockResolvedValue(author),
      }),
    ).rejects.toMatchObject({ code: "invalid-record" });
  });

  it("rejects malformed envelopes before constructing LoadedSnapshot", async () => {
    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockRejectedValue(new TypeError("offline")),
        direct: vi.fn().mockResolvedValue({ ...envelope, cid: undefined }),
        resolveActor: vi.fn().mockResolvedValue(author),
      }),
    ).rejects.toMatchObject({ code: "invalid-record" });
  });

  it("passes the abort signal through every fallback stage", async () => {
    const { signal } = new AbortController();
    const slingshot = vi.fn().mockRejectedValue(new TypeError("offline"));
    const direct = vi.fn().mockResolvedValue(envelope);
    const resolveActor = vi.fn().mockResolvedValue(author);
    const blob = vi.fn().mockResolvedValue({
      bytes: new TextEncoder().encode("model User { id Int @id }"),
      contentType: "text/plain",
    });

    await loadPublicRecord(uri, {
      signal,
      slingshot,
      direct,
      resolveActor,
      blob,
    });

    expect(slingshot).toHaveBeenCalledWith(uri, signal);
    expect(resolveActor).toHaveBeenCalledWith(author.did, { signal });
    expect(direct).toHaveBeenCalledWith(author.pds, uri, signal);
    expect(blob).toHaveBeenCalledWith(
      author.pds,
      author.did,
      validSchemaBlob.ref.$link,
      signal,
    );
  });
  it("rejects a schema blob with the wrong response content type", async () => {
    const blob = vi.fn().mockResolvedValue({
      bytes: new TextEncoder().encode("model User { id Int @id }"),
      contentType: "application/json",
    });

    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockResolvedValue(envelope),
        resolveActor: vi.fn().mockResolvedValue(author),
        blob,
      }),
    ).rejects.toMatchObject({ code: "invalid-record" });
  });

  it("rejects a schema blob whose declared size exceeds the limit", async () => {
    const oversized = {
      ...envelope,
      value: {
        ...envelope.value,
        schema: { ...validSchemaBlob, size: 500_001 },
      },
    };
    const blob = vi.fn();

    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockRejectedValue(new TypeError("offline")),
        direct: vi.fn().mockResolvedValue(oversized),
        resolveActor: vi.fn().mockResolvedValue(author),
        blob,
      }),
    ).rejects.toMatchObject({ code: "invalid-record" });

    expect(blob).not.toHaveBeenCalled();
  });

  it("rejects a record with a missing schema blob", async () => {
    const missing = {
      ...envelope,
      value: { ...envelope.value, schema: undefined },
    };

    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockRejectedValue(new TypeError("offline")),
        direct: vi.fn().mockResolvedValue(missing),
        resolveActor: vi.fn().mockResolvedValue(author),
      }),
    ).rejects.toMatchObject({ code: "invalid-record" });
  });

  it("rejects received schema bytes over the limit", async () => {
    const blob = vi.fn().mockResolvedValue({
      bytes: new Uint8Array(500_001),
      contentType: "text/plain",
    });

    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockResolvedValue(envelope),
        resolveActor: vi.fn().mockResolvedValue(author),
        blob,
      }),
    ).rejects.toMatchObject({ code: "invalid-record" });
  });

  it("rejects malformed UTF-8 schema bytes", async () => {
    const blob = vi.fn().mockResolvedValue({
      bytes: new Uint8Array([0xc3, 0x28]),
      contentType: "text/plain",
    });

    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockResolvedValue(envelope),
        resolveActor: vi.fn().mockResolvedValue(author),
        blob,
      }),
    ).rejects.toMatchObject({ code: "invalid-record" });
  });

  it("maps a blob dependency TypeError to pds-cors", async () => {
    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockResolvedValue(envelope),
        resolveActor: vi.fn().mockResolvedValue(author),
        blob: vi.fn().mockRejectedValue(new TypeError("offline")),
      }),
    ).rejects.toMatchObject({ code: "pds-cors" });
  });

  it("maps a missing PDS blob response to invalid-record", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "BlobNotFound" }), {
        headers: { "content-type": "application/json" },
        status: 400,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockResolvedValue(envelope),
        resolveActor: vi.fn().mockResolvedValue(author),
      }),
    ).rejects.toMatchObject({ code: "invalid-record" });
  });

  it("uses atcute bytes for the default PDS blob request", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(new TextEncoder().encode("model User { id Int @id }"), {
        headers: { "content-type": "text/plain; charset=utf-8" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const loaded = await loadPublicRecord(uri, {
      slingshot: vi.fn().mockResolvedValue(envelope),
      resolveActor: vi.fn().mockResolvedValue(author),
    });

    expect(loaded.schema).toBe("model User { id Int @id }");
    expect(fetch).toHaveBeenCalledOnce();
    const [request, init] = fetch.mock.calls[0]!;
    expect(request).toContain("/xrpc/com.atproto.sync.getBlob");
    expect(request).toContain(`did=${encodeURIComponent(author.did)}`);
    expect(request).toContain(
      `cid=${encodeURIComponent(validSchemaBlob.ref.$link)}`,
    );
    expect(init).toMatchObject({ method: "get", signal: undefined });
  });

  it("maps a default PDS blob fetch rejection to pds-cors", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetch);

    await expect(
      loadPublicRecord(uri, {
        slingshot: vi.fn().mockResolvedValue(envelope),
        resolveActor: vi.fn().mockResolvedValue(author),
      }),
    ).rejects.toMatchObject({ code: "pds-cors" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
