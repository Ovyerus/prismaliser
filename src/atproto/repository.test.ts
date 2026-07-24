import { describe, expect, it, vi } from "vitest";

import {
  createAtcuteRepositoryTransport,
  createSnapshot,
  deleteSnapshot,
  listSnapshots,
} from "~/atproto/repository";
import type { RepositoryTransport } from "~/atproto/repository";
import type { ConnectedSession, SnapshotDraft } from "~/atproto/types";

import type { Client } from "@atcute/client";

const validSchemaBlob = {
  $type: "blob" as const,
  mimeType: "text/plain",
  ref: {
    $link: "bafkreigh2akiscaildcqpo6n3v6r5q6a6bq4q6qk7u2f5m2a3r6b4d5c6e",
  },
  size: 29,
};

const created = {
  uri: "at://did:plc:alice/app.prismaliser.schema/3kz6m2b2",
  cid: "bafycreated",
};

const draft: SnapshotDraft = {
  name: "  Customer model  ",
  schema: "model Customer { id Int @id }",
  positions: [{ id: "Customer", x: 12.4, y: -7.6 }],
};

const session = {
  did: "did:plc:alice",
  client: {},
  agent: {},
} as ConnectedSession;

const validRecord = {
  $type: "app.prismaliser.schema" as const,
  schema: validSchemaBlob,
  positions: [{ id: "Customer", x: 12, y: -8 }],
  prismaVersion: "7.9.0",
  createdAt: "2026-07-24T12:00:00.000Z",
};

const createTransport = () =>
  ({
    uploadBlob: vi.fn<RepositoryTransport["uploadBlob"]>(() =>
      Promise.resolve({ blob: validSchemaBlob }),
    ),
    createRecord: vi.fn<RepositoryTransport["createRecord"]>(() =>
      Promise.resolve(created),
    ),
    listRecords: vi.fn<RepositoryTransport["listRecords"]>(() =>
      Promise.resolve({ records: [] }),
    ),
    deleteRecord: vi.fn<RepositoryTransport["deleteRecord"]>(() =>
      Promise.resolve(),
    ),
  }) satisfies RepositoryTransport;

describe("authenticated snapshot repository operations", () => {
  it("uploads the schema blob before creating the record", async () => {
    const transport = createTransport();
    const calls: string[] = [];
    vi.mocked(transport.uploadBlob).mockImplementation(async ({ blob }) => {
      calls.push(`upload:${blob.type}:${blob.size}`);
      expect(await blob.text()).toBe(draft.schema);
      return { blob: validSchemaBlob };
    });
    vi.mocked(transport.createRecord).mockImplementation(async (input) => {
      calls.push(`create:${input.record.schema.mimeType}`);
      return created;
    });

    await expect(createSnapshot(session, draft, transport)).resolves.toEqual(
      created,
    );
    expect(calls).toEqual(["upload:text/plain:29", "create:text/plain"]);
    expect(transport.uploadBlob).toHaveBeenCalledOnce();
    expect(transport.createRecord).toHaveBeenCalledOnce();
    expect(transport.createRecord).toHaveBeenCalledWith({
      repo: "did:plc:alice",
      collection: "app.prismaliser.schema",
      record: expect.objectContaining({
        $type: "app.prismaliser.schema",
        name: "Customer model",
        schema: validSchemaBlob,
        positions: [{ id: "Customer", x: 12, y: -8 }],
      }),
    });
    expect(transport.createRecord).not.toHaveBeenCalledWith(
      expect.objectContaining({ rkey: expect.anything() }),
    );
  });

  it("does not create a record when blob upload fails", async () => {
    const transport = createTransport();
    vi.mocked(transport.uploadBlob).mockRejectedValue(
      new Error("upload failed"),
    );

    await expect(createSnapshot(session, draft, transport)).rejects.toThrow(
      "upload failed",
    );
    expect(transport.createRecord).not.toHaveBeenCalled();
  });

  it("rejects an oversized UTF-8 schema before uploading", async () => {
    const transport = createTransport();
    const oversizedDraft = { ...draft, schema: "é".repeat(250_001) };

    await expect(
      createSnapshot(session, oversizedDraft, transport),
    ).rejects.toThrow("500000");
    expect(transport.uploadBlob).not.toHaveBeenCalled();
    expect(transport.createRecord).not.toHaveBeenCalled();
  });

  it("rejects an invalid blob reference returned by upload", async () => {
    const transport = createTransport();
    vi.mocked(transport.uploadBlob).mockResolvedValue({
      blob: { ...validSchemaBlob, mimeType: "application/json" },
    });

    await expect(createSnapshot(session, draft, transport)).rejects.toThrow(
      "Schema blob MIME type must be text/plain",
    );
    expect(transport.createRecord).not.toHaveBeenCalled();
  });

  it("lists newest snapshots and counts malformed record values", async () => {
    const transport = createTransport();
    vi.mocked(transport.listRecords).mockResolvedValue({
      cursor: "next-page",
      records: [
        {
          uri: created.uri,
          cid: created.cid,
          value: { ...validRecord, name: "  Named snapshot  " },
        },
        {
          uri: "at://did:plc:alice/app.prismaliser.schema/3kz6m2b1",
          cid: "bafyderived",
          value: {
            ...validRecord,
            positions: [
              { id: "_PostToTag", x: 0, y: 0 },
              { id: "Post", x: 1, y: 2 },
              { id: "Tag", x: 3, y: 4 },
              { id: "User", x: 5, y: 6 },
              { id: "Ignored", x: 7, y: 8 },
            ],
          },
        },
        {
          uri: "at://did:plc:alice/app.prismaliser.schema/3kz6m2b0",
          cid: "bafyinvalid",
          value: { ...validRecord, positions: "not-an-array" },
        },
      ],
    });

    await expect(
      listSnapshots(session, { cursor: "previous-page", limit: 25 }, transport),
    ).resolves.toEqual({
      cursor: "next-page",
      invalidCount: 1,
      snapshots: [
        {
          uri: created.uri,
          cid: created.cid,
          name: "  Named snapshot  ",
          label: "Named snapshot",
          createdAt: validRecord.createdAt,
          nodeIds: ["Customer"],
        },
        {
          uri: "at://did:plc:alice/app.prismaliser.schema/3kz6m2b1",
          cid: "bafyderived",
          label: "Post, Tag, User",
          createdAt: validRecord.createdAt,
          nodeIds: ["_PostToTag", "Post", "Tag", "User", "Ignored"],
        },
      ],
    });
    expect(transport.listRecords).toHaveBeenCalledWith({
      repo: "did:plc:alice",
      collection: "app.prismaliser.schema",
      cursor: "previous-page",
      limit: 25,
      reverse: true,
    });
  });

  it("deletes the record identified by a canonical Prismaliser URI", async () => {
    const transport = createTransport();

    await expect(
      deleteSnapshot(session, created.uri, transport),
    ).resolves.toBeUndefined();
    expect(transport.deleteRecord).toHaveBeenCalledWith({
      repo: "did:plc:alice",
      collection: "app.prismaliser.schema",
      rkey: "3kz6m2b2",
    });
  });

  it("rejects deleting a URI from another collection", async () => {
    const transport = createTransport();

    await expect(
      deleteSnapshot(
        session,
        "at://did:plc:alice/app.example.other/3kz6m2b2",
        transport,
      ),
    ).rejects.toThrow("Not a Prismaliser snapshot URI");
    expect(transport.deleteRecord).not.toHaveBeenCalled();
  });
});

describe("atcute repository transport", () => {
  it("wraps standard repo XRPC endpoints with their exact contracts", async () => {
    const post = vi.fn((endpoint: string) => {
      if (endpoint === "com.atproto.repo.uploadBlob")
        return Promise.resolve({
          ok: true as const,
          data: { blob: validSchemaBlob },
          status: 200,
          headers: new Headers(),
        });
      if (endpoint === "com.atproto.repo.createRecord")
        return Promise.resolve({
          ok: true as const,
          data: created,
          status: 200,
          headers: new Headers(),
        });
      return Promise.resolve({
        ok: true as const,
        data: {},
        status: 200,
        headers: new Headers(),
      });
    });
    const get = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        data: { cursor: "next-page", records: [] },
        status: 200,
        headers: new Headers(),
      }),
    );
    const transport = createAtcuteRepositoryTransport({
      post,
      get,
    } as unknown as Client);
    const createInput = {
      repo: "did:plc:alice",
      collection: "app.prismaliser.schema" as const,
      record: validRecord,
    };
    const listInput = {
      repo: "did:plc:alice",
      collection: "app.prismaliser.schema" as const,
      cursor: "previous-page",
      limit: 25,
      reverse: true as const,
    };
    const deleteInput = {
      repo: "did:plc:alice",
      collection: "app.prismaliser.schema" as const,
      rkey: "3kz6m2b2",
    };
    const uploadBlob = new Blob([draft.schema], { type: "text/plain" });

    await expect(transport.uploadBlob({ blob: uploadBlob })).resolves.toEqual({
      blob: validSchemaBlob,
    });
    await expect(transport.createRecord(createInput)).resolves.toEqual(created);
    await expect(transport.listRecords(listInput)).resolves.toEqual({
      cursor: "next-page",
      records: [],
    });
    await expect(transport.deleteRecord(deleteInput)).resolves.toBeUndefined();

    expect(uploadBlob.type).toBe("text/plain");
    expect(uploadBlob.size).toBe(29);
    expect(await uploadBlob.text()).toBe(draft.schema);
    expect(post).toHaveBeenNthCalledWith(1, "com.atproto.repo.uploadBlob", {
      input: uploadBlob,
    });
    expect(post).toHaveBeenNthCalledWith(2, "com.atproto.repo.createRecord", {
      input: createInput,
    });
    expect(get).toHaveBeenCalledWith("com.atproto.repo.listRecords", {
      params: listInput,
    });
    expect(post).toHaveBeenNthCalledWith(3, "com.atproto.repo.deleteRecord", {
      input: deleteInput,
    });
    expect(transport).not.toHaveProperty("updateRecord");
  });

  it("rejects failed XRPC responses through atcute ok", async () => {
    const client = {
      post: vi.fn(() =>
        Promise.resolve({
          ok: false as const,
          data: { error: "Forbidden", message: "not authorised" },
          status: 403,
          headers: new Headers(),
        }),
      ),
    } as unknown as Client;
    const transport = createAtcuteRepositoryTransport(client);

    await expect(
      transport.createRecord({
        repo: "did:plc:alice",
        collection: "app.prismaliser.schema",
        record: validRecord,
      }),
    ).rejects.toThrow("not authorised");
  });
});
