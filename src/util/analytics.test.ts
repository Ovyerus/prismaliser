import { expect, it } from "vitest";

import { shouldLoadAnalytics } from "~/util/analytics";

it("keeps OAuth callback URLs out of analytics", () => {
  expect(
    shouldLoadAnalytics(
      new URL(
        "https://example.com/#code=a&state=b&iss=https%3A%2F%2Fpds.example",
      ),
    ),
  ).toBe(false);
  expect(
    shouldLoadAnalytics(
      new URL("https://example.com/#error=access_denied&state=b"),
    ),
  ).toBe(false);
});

it("keeps inline-schema URLs out of analytics", () => {
  expect(
    shouldLoadAnalytics(new URL("https://example.com/?code=c2NoZW1h")),
  ).toBe(false);
});

it("allows analytics for public records and incomplete callback fragments", () => {
  expect(
    shouldLoadAnalytics(
      new URL(
        "https://example.com/?at=at%3A%2F%2Fdid%3Aplc%3Ax%2Fapp.prismaliser.schema%2Fy",
      ),
    ),
  ).toBe(true);
  expect(shouldLoadAnalytics(new URL("https://example.com/#code=a"))).toBe(
    true,
  );
  expect(shouldLoadAnalytics(new URL("https://example.com/#state=b"))).toBe(
    true,
  );
});
