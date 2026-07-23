import * as prismaSchemaWasm from "@prisma/prisma-schema-wasm";
import { describe, expect, it } from "vitest";

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { formatSchema, getDMMF, PrismaSchemaError } from "~/util/prisma";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const wasmPath = path.join(
  projectRoot,
  "node_modules/@prisma/prisma-schema-wasm/src/prisma_schema_build_bg.wasm",
);
// eslint-disable-next-line no-sync
const wasmBytes = fs.readFileSync(wasmPath);
prismaSchemaWasm.__init(wasmBytes);

describe("getDMMF", () => {
  it("parses a valid schema into a datamodel with models and fields", async () => {
    const schema = `datasource db {
  provider = "postgresql"
}

model User {
  id   Int    @id
  name String
}
`;
    const datamodel = await getDMMF(schema);

    expect(datamodel.models).toHaveLength(1);
    expect(datamodel.models[0]!.name).toBe("User");
    expect(datamodel.models[0]!.fields.map((field) => field.name)).toEqual([
      "id",
      "name",
    ]);
  });

  it("parses enum definitions", async () => {
    const schema = `datasource db {
  provider = "postgresql"
}

enum Role {
  USER
  ADMIN
}

model User {
  id   Int  @id
  role Role
}
`;
    const datamodel = await getDMMF(schema);

    expect(datamodel.enums).toHaveLength(1);
    expect(datamodel.enums[0]!.name).toBe("Role");
    expect(datamodel.enums[0]!.values.map((value) => value.name)).toEqual([
      "USER",
      "ADMIN",
    ]);
  });

  it("throws PrismaSchemaError with per-line diagnostics for invalid schemas", async () => {
    const schema = `datasource db {
  provider = "postgresql"
}

model User {
  id Int
  id Int
}
`;

    await expect(getDMMF(schema)).rejects.toBeInstanceOf(PrismaSchemaError);
    await expect(getDMMF(schema)).rejects.toMatchObject({
      errors: [
        {
          reason: expect.stringContaining('Field "id" is already defined'),
          row: "7",
        },
      ],
    });
  });
});

describe("formatSchema", () => {
  it("formats a messy schema", async () => {
    const messy = `datasource db { provider = "postgresql" }



model User { id Int @id }`;
    const formatted = await formatSchema(messy);

    expect(formatted).toContain("\n\nmodel User {");
    expect(formatted).not.toContain("\n\n\n");
  });
});
