import { describe, expect, it } from "vitest";

import { fromUrlSafeB64, parseDMMFError, toUrlSafeB64 } from "~/util";

describe("parseDMMFError", () => {
  it("extracts reason and row from rendered Prisma diagnostics", () => {
    const rendered = `error: Field "id" is already defined on model "User".
  -->  schema.prisma:7
   | 
 6 |   id Int
 7 |   id Int
   | 

Validation Error Count: 1`;

    expect(parseDMMFError(rendered)).toEqual([
      {
        reason: 'Field "id" is already defined on model "User".',
        row: "7",
      },
    ]);
  });

  it("extracts multiple diagnostics", () => {
    const rendered = `error: First error.
  -->  schema.prisma:3
   | 
error: Second error.
  -->  schema.prisma:8
   | `;

    expect(parseDMMFError(rendered)).toEqual([
      { reason: "First error.", row: "3" },
      { reason: "Second error.", row: "8" },
    ]);
  });
});

describe("URL-safe base64", () => {
  it("encodes to URL-safe characters and decodes back", () => {
    const original = "><";
    const encoded = toUrlSafeB64(original);

    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("+");
    expect(fromUrlSafeB64(encoded)).toBe(original);
  });

  it("round-trips a schema-like payload", () => {
    const original = `datasource db {
  provider = "postgresql"
}

model User {
  id Int @id
}
`;

    expect(fromUrlSafeB64(toUrlSafeB64(original))).toBe(original);
  });
});
