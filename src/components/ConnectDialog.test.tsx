import {
  AuthorizationError,
  OAuthResponseError,
} from "@atcute/oauth-browser-client";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ConnectDialog, {
  getAccountConnectionError,
  validateHandleInput,
} from "~/components/ConnectDialog";

describe("ConnectDialog", () => {
  it("renders the approved account connection copy without account creation", () => {
    const markup = renderToStaticMarkup(
      <ConnectDialog
        open
        onClose={vi.fn()}
        onConnect={vi.fn()}
        onConnectBluesky={vi.fn()}
      />,
    );

    expect(markup).toContain("Connect an AT Protocol account");
    expect(markup).toContain(
      "Use your account to publish and manage shared diagrams.",
    );
    expect(markup).toContain("alice.bsky.social");
    expect(markup).toContain(
      "If you use Bluesky, this is your Bluesky handle.",
    );
    expect(markup).toContain(">Tangled</a><span>.</span>");
    expect(markup).toContain(
      "Shared schemas are public. Check them for passwords, connection strings, and other secrets before publishing.",
    );
    expect(markup).toContain("What is an Atmosphere account?");
    expect(markup).toContain("Connect");
    expect(markup).toContain("Connect with Bluesky");
    expect(markup).not.toContain("Create an account");
  });

  it("trims valid handles and rejects invalid ones", () => {
    expect(validateHandleInput("  alice.bsky.social  ")).toBe(
      "alice.bsky.social",
    );
    expect(validateHandleInput("not a handle")).toBeNull();
  });

  it("maps granular scope rejection to the narrow-permission explanation", () => {
    const error = new OAuthResponseError(new Response(null, { status: 400 }), {
      error: "invalid_scope",
    });

    expect(getAccountConnectionError(error)).toBe(
      "This provider cannot grant Prismaliser's narrow repository permission. Prismaliser will not request broader access.",
    );
  });

  it("maps atcute granular permission failures to the narrow-permission explanation", () => {
    const error = new OAuthResponseError(new Response(null, { status: 400 }), {
      error: "invalid_request",
      error_description:
        "This authorization server does not support granular repository permissions",
    });

    expect(getAccountConnectionError(error)).toBe(
      "This provider cannot grant Prismaliser's narrow repository permission. Prismaliser will not request broader access.",
    );
  });

  it("uses the preserved callback code when the provider description hides it", () => {
    const error = new AuthorizationError(
      "The requested repository permission is unsupported",
    );

    expect(getAccountConnectionError(error, "invalid_scope")).toBe(
      "This provider cannot grant Prismaliser's narrow repository permission. Prismaliser will not request broader access.",
    );
  });

  it("maps granular callback descriptions after atcute wraps them", () => {
    const error = new AuthorizationError(
      "Granular repository permission is unsupported",
    );

    expect(getAccountConnectionError(error, "invalid_request")).toBe(
      "This provider cannot grant Prismaliser's narrow repository permission. Prismaliser will not request broader access.",
    );
  });

  it("announces callback failures without replacing the handle field", () => {
    const markup = renderToStaticMarkup(
      <ConnectDialog
        error="Account connection was not authorised. Your schema is unchanged."
        initialHandle="alice.bsky.social"
        open
        onClose={vi.fn()}
        onConnect={vi.fn()}
        onConnectBluesky={vi.fn()}
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain(
      "Account connection was not authorised. Your schema is unchanged.",
    );
    expect(markup).toContain('name="handle"');
    expect(markup).toContain('value="alice.bsky.social"');
  });
});
