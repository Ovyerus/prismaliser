import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import SnapshotBar from "~/components/SnapshotBar";

describe("SnapshotBar", () => {
  it("renders a control for closing the current share", () => {
    const markup = renderToStaticMarkup(
      <SnapshotBar
        author="alice.example"
        createdAt="2026-07-26T00:00:00.000Z"
        label="Shared diagram"
        status="original"
        onCopyOriginal={vi.fn()}
        onDetachShare={vi.fn()}
      />,
    );

    expect(markup).toContain("Close share");
  });
});
