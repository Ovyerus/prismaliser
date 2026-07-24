import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ShareDialog from "~/components/ShareDialog";

const callbacks = {
  onClose: vi.fn(),
  onConnect: vi.fn(),
  onCopyLegacy: vi.fn(),
  onPublish: vi.fn(),
};

describe("ShareDialog", () => {
  it("explains immutable public publication and both share paths", () => {
    const html = renderToStaticMarkup(
      <ShareDialog {...callbacks} pending={false} accountConnected open />,
    );

    expect(html).toContain("Name (optional)");
    expect(html).toContain("current schema and node positions");
    expect(html).toContain("Shared schemas are public");
    expect(html).toContain("passwords, connection strings, and other secrets");
    expect(html).toContain("Publish and copy link");
    expect(html).toContain("Copy a schema-only link without publishing");
  });

  it("requires connection before a logged-out publication", () => {
    const html = renderToStaticMarkup(
      <ShareDialog
        {...callbacks}
        accountConnected={false}
        pending={false}
        open
      />,
    );

    expect(html).toContain("Connect to publish");
    expect(html).not.toContain(">Publish and copy link<");
  });

  it("announces publication progress without replacing the action label", () => {
    const html = renderToStaticMarkup(
      <ShareDialog {...callbacks} pending accountConnected open />,
    );

    expect(html).toContain("Publish and copy link");
    expect(html).toContain('role="status"');
    expect(html).toContain("Publishing…");
  });

  it("renders publication errors and a read-only manual-copy link", () => {
    const link =
      "https://prismaliser.app/?at=at%3A%2F%2Fdid%3Aplc%3Aalice%2Fapp.prismaliser.schema%2F3kexample";
    const html = renderToStaticMarkup(
      <ShareDialog
        {...callbacks}
        error="Publication failed"
        manualLink={link}
        pending={false}
        accountConnected
        open
      />,
    );

    expect(html).toContain("Publication failed");
    expect(html).toContain(
      "Published successfully, but the link could not be copied",
    );
    expect(html).toContain(`value="${link.replaceAll("&", "&amp;")}"`);
    expect(html).toContain('readOnly=""');
  });
});
