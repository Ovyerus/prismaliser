import * as prismaSchemaWasm from "@prisma/prisma-schema-wasm";
import { describe, expect, it } from "vitest";

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { getDMMF } from "~/util/prisma";
import {
  enumEdgeTargetHandleId,
  generateFlowFromDMMF,
  relationEdgeSourceHandleId,
  relationEdgeTargetHandleId,
} from "~/util/prismaToFlow";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const wasmPath = path.join(
  projectRoot,
  "node_modules/@prisma/prisma-schema-wasm/src/prisma_schema_build_bg.wasm",
);
// eslint-disable-next-line no-sync
const wasmBytes = fs.readFileSync(wasmPath);
prismaSchemaWasm.__init(wasmBytes);

const flowFromSchema = async (schema: string) => {
  const datamodel = await getDMMF(schema);
  return generateFlowFromDMMF(datamodel, [], null);
};

describe("generateFlowFromDMMF", () => {
  it("types a 1-1 relation on the connecting edge", async () => {
    const schema = `datasource db {
  provider = "postgresql"
}

model User {
  id      Int      @id
  profile Profile?
}

model Profile {
  id     Int  @id
  user   User @relation(fields: [userId], references: [id])
  userId Int  @unique
}
`;
    const result = await flowFromSchema(schema);

    const edge = result.edges.find((e) => e.id === "edge-ProfileToUser")!;
    expect(edge.data).toEqual({ relationType: "1-1" });
  });

  it("types a 1-n relation on the connecting edge", async () => {
    const schema = `datasource db {
  provider = "postgresql"
}

model User {
  id    Int     @id
  posts Post[]
}

model Post {
  id     Int  @id
  author User @relation(fields: [userId], references: [id])
  userId Int
}
`;
    const result = await flowFromSchema(schema);

    const edge = result.edges.find((e) => e.id === "edge-PostToUser")!;
    expect(edge.data).toEqual({ relationType: "1-n" });
  });

  it("fabricates a virtual model for implicit m-n relations with A/B columns", async () => {
    const schema = `datasource db {
  provider = "postgresql"
}

model Post {
  id    Int     @id
  tags  Tag[]
}

model Tag {
  id    Int    @id
  posts Post[]
}
`;
    const result = await flowFromSchema(schema);

    const virtualNode = result.nodes.find((n) => n.id === "_PostToTag")!;
    expect(virtualNode.data.type).toBe("model");
    const virtualModel = virtualNode.data as Extract<
      typeof virtualNode.data,
      { type: "model" }
    >;
    expect(virtualModel.columns.map((column) => column.name)).toEqual([
      "A",
      "B",
    ]);
    expect(virtualModel.columns.map((column) => column.type)).toEqual([
      "Post",
      "Tag",
    ]);

    expect(result.edges.some((e) => e.id === "edge-PostToTag-Post")).toBe(true);
    expect(result.edges.some((e) => e.id === "edge-PostToTag-Tag")).toBe(true);
  });

  it("creates enum nodes and edges from enum fields", async () => {
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
    const result = await flowFromSchema(schema);

    const enumNode = result.nodes.find((n) => n.id === "Role")!;
    expect(enumNode.data.type).toBe("enum");
    const enumData = enumNode.data as Extract<
      typeof enumNode.data,
      { type: "enum" }
    >;
    expect(enumData.values).toEqual(["USER", "ADMIN"]);

    const enumEdge = result.edges.find((e) => e.id === "edge-User-role-Role")!;
    expect(enumEdge.source).toBe("Role");
    expect(enumEdge.target).toBe("User");
    expect(enumEdge.sourceHandle).toBe("Role");
    expect(enumEdge.targetHandle).toBe(enumEdgeTargetHandleId("User", "role"));
  });

  it("uses relationEdgeSourceHandleId and relationEdgeTargetHandleId shapes for relation edges", async () => {
    const schema = `datasource db {
  provider = "postgresql"
}

model User {
  id    Int     @id
  posts Post[]
}

model Post {
  id     Int  @id
  author User @relation(fields: [userId], references: [id])
  userId Int
}
`;
    const result = await flowFromSchema(schema);

    const edge = result.edges.find((e) => e.id === "edge-PostToUser")!;
    expect(edge.sourceHandle).toBe(
      relationEdgeSourceHandleId("Post", "PostToUser", "author"),
    );
    expect(edge.targetHandle).toBe(
      relationEdgeTargetHandleId("User", "PostToUser", "posts"),
    );
  });
});
