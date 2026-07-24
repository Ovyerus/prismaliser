import { ClientResponseError } from "@atcute/client";
import { TokenRefreshError } from "@atcute/oauth-browser-client";
import { describe, expect, it, vi } from "vitest";

import {
  bootstrapOAuthSession,
  createSnapshotDraft,
  isExpiredSessionError,
  publishSnapshotDraft,
  retainOAuthMetadataAvailability,
  selectSnapshotPositions,
} from "~/App";
import type { ConnectedSession, SnapshotDraft } from "~/atproto/types";
import type { NodePosition } from "~/util/types";

const session = { did: "did:plc:alice" } as ConnectedSession;
const draft: SnapshotDraft = {
  schema: "model User { id Int @id }",
  positions: [],
};

describe("OAuth application bootstrap", () => {
  it("configures, validates, finalises a callback, then restores its pending draft", async () => {
    const calls: string[] = [];
    const result = await bootstrapOAuthSession({
      configure: () => calls.push("configure"),
      finalizeCallback() {
        calls.push("finalize");
        return Promise.resolve(session);
      },
      hasCallback: () => true,
      resumeSession: vi.fn(),
      takePendingShare() {
        calls.push("pending-share");
        return draft;
      },
      validateMetadata() {
        calls.push("validate");
        return Promise.resolve(true);
      },
    });

    expect(calls).toEqual([
      "configure",
      "validate",
      "finalize",
      "pending-share",
    ]);
    expect(result).toEqual({
      atprotoAvailable: true,
      pendingShare: draft,
      session,
    });
  });

  it("retains metadata availability when callback finalisation rejects", async () => {
    const metadataAvailable = { current: false };
    const callbackError = new Error("callback rejected");

    await expect(
      bootstrapOAuthSession({
        configure: vi.fn(),
        finalizeCallback: () => Promise.reject(callbackError),
        hasCallback: () => true,
        resumeSession: vi.fn(),
        takePendingShare: vi.fn(),
        validateMetadata: () =>
          retainOAuthMetadataAvailability(
            () => Promise.resolve(true),
            metadataAvailable,
          ),
      }),
    ).rejects.toBe(callbackError);

    expect(metadataAvailable.current).toBe(true);
  });

  it("resumes the active session only when there is no callback", async () => {
    const finalizeCallback = vi.fn();
    const takePendingShare = vi.fn();
    const result = await bootstrapOAuthSession({
      configure: vi.fn(),
      finalizeCallback,
      hasCallback: () => false,
      resumeSession: () => Promise.resolve(session),
      takePendingShare,
      validateMetadata: () => Promise.resolve(true),
    });

    expect(result.session).toBe(session);
    expect(result.pendingShare).toBeNull();
    expect(finalizeCallback).not.toHaveBeenCalled();
    expect(takePendingShare).not.toHaveBeenCalled();
  });

  it("leaves schema editing usable without starting a session when metadata is unavailable", async () => {
    const finalizeCallback = vi.fn();
    const resumeSession = vi.fn();
    const result = await bootstrapOAuthSession({
      configure: vi.fn(),
      finalizeCallback,
      hasCallback: () => true,
      resumeSession,
      takePendingShare: vi.fn(),
      validateMetadata: () => Promise.resolve(false),
    });

    expect(result).toEqual({
      atprotoAvailable: false,
      pendingShare: null,
      session: null,
    });
    expect(finalizeCallback).not.toHaveBeenCalled();
    expect(resumeSession).not.toHaveBeenCalled();
  });
});

describe("snapshot publication", () => {
  const positions: NodePosition[] = [{ id: "User", x: 42, y: 81 }];

  it("omits a blank name while preserving the current schema and positions", () => {
    expect(createSnapshotDraft(draft.schema, positions, " \n ")).toStrictEqual({
      schema: draft.schema,
      positions,
    });
  });

  it("trims a non-blank snapshot name", () => {
    expect(
      createSnapshotDraft(draft.schema, positions, "  User model  "),
    ).toStrictEqual({
      name: "User model",
      schema: draft.schema,
      positions,
    });
  });

  it("keeps restored positions until the graph is ready, then uses its latest positions", () => {
    expect(selectSnapshotPositions([], positions)).toBe(positions);

    const currentPositions = [{ id: "User", x: 99, y: 123 }];
    expect(selectSnapshotPositions(currentPositions, positions, false)).toBe(
      positions,
    );
    expect(selectSnapshotPositions(currentPositions, positions)).toBe(
      currentPositions,
    );
  });

  it("recognises only expired-session failures from a create mutation", () => {
    expect(
      isExpiredSessionError(
        new ClientResponseError({
          data: { error: "AuthenticationRequired" },
          status: 401,
        }),
      ),
    ).toBe(true);
    expect(
      isExpiredSessionError(
        new TokenRefreshError("did:plc:alice", "refresh expired"),
      ),
    ).toBe(true);
    expect(
      isExpiredSessionError(
        new ClientResponseError({
          data: { error: "InternalServerError" },
          status: 500,
        }),
      ),
    ).toBe(false);
    expect(isExpiredSessionError(new Error("network unavailable"))).toBe(false);
  });

  it("returns a manual link after one successful mutation when clipboard access is denied", async () => {
    const create = vi.fn().mockResolvedValue({
      uri: "at://did:plc:alice/app.prismaliser.schema/3kexample",
      cid: "bafyexample",
    });
    const copy = vi.fn().mockRejectedValue(new Error("clipboard denied"));

    await expect(
      publishSnapshotDraft(session, draft, {
        copy,
        create,
        createUrl: (uri) => `https://prismaliser.app/?at=${uri}`,
      }),
    ).resolves.toEqual({
      copied: false,
      link: "https://prismaliser.app/?at=at://did:plc:alice/app.prismaliser.schema/3kexample",
      snapshot: {
        uri: "at://did:plc:alice/app.prismaliser.schema/3kexample",
        cid: "bafyexample",
      },
    });
    expect(create).toHaveBeenCalledOnce();
    expect(copy).toHaveBeenCalledOnce();
  });

  it("does not copy or retry when the publication mutation rejects", async () => {
    const mutationError = new Error("session expired");
    const create = vi.fn().mockRejectedValue(mutationError);
    const copy = vi.fn();

    await expect(
      publishSnapshotDraft(session, draft, {
        copy,
        create,
        createUrl: vi.fn(),
      }),
    ).rejects.toBe(mutationError);
    expect(create).toHaveBeenCalledOnce();
    expect(copy).not.toHaveBeenCalled();
  });
});
