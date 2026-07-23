import { describe, expect, it } from "vitest";

import { getLayout } from "~/util/layout";
import type { EnumNodeData, ModelNodeData } from "~/util/types";

import type { Node } from "reactflow";

const FIELD_HEIGHT = 50;
const CHAR_WIDTH = 10;
const MIN_SIZE = 100;
const MARGIN = 50;
const MAX_ENUM_HEIGHT = 600;

const baseModelNode = (
  name: string,
  columns: ModelNodeData["columns"],
): Node<ModelNodeData> => ({
  id: name,
  type: "model",
  position: { x: 0, y: 0 },
  data: {
    type: "model",
    name,
    dbName: null,
    columns,
  },
});

const baseEnumNode = (name: string, values: string[]): Node<EnumNodeData> => ({
  id: name,
  type: "enum",
  position: { x: 0, y: 0 },
  data: {
    type: "enum",
    name,
    values,
  },
});

const scalarColumn = (
  name: string,
  type: string,
): ModelNodeData["columns"][0] => ({
  name,
  type,
  displayType: type,
  kind: "scalar",
  isList: false,
  isRequired: true,
  defaultValue: null,
  relationData: null,
});

describe("getLayout", () => {
  it("assigns positions to every node", async () => {
    const nodes = [
      baseModelNode("User", [scalarColumn("id", "Int")]),
      baseEnumNode("Role", ["USER", "ADMIN"]),
    ];

    const layout = await getLayout(nodes, []);

    expect(layout.children).toHaveLength(2);
    for (const child of layout.children!) {
      expect(typeof child.x).toBe("number");
      expect(typeof child.y).toBe("number");
    }
  });

  it("uses a minimum width based on MIN_SIZE and MARGIN", async () => {
    const nodes = [baseModelNode("User", [scalarColumn("id", "Int")])];

    const layout = await getLayout(nodes, []);
    const userLayout = layout.children!.find((child) => child.id === "User")!;

    expect(userLayout.width).toBe(MIN_SIZE + MARGIN * 2);
  });

  it("scales model width with the longest column text", async () => {
    const nodes = [
      baseModelNode("VeryLongUserName", [
        scalarColumn("veryLongColumnName", "VeryLongColumnType"),
      ]),
    ];

    const layout = await getLayout(nodes, []);
    const layoutNode = layout.children![0]!;
    const expectedWidth = (16 + 20) * CHAR_WIDTH + MARGIN * 2;

    expect(layoutNode.width).toBe(expectedWidth);
  });

  it("scales model height with field count plus a title row", async () => {
    const nodes = [
      baseModelNode("User", [
        scalarColumn("id", "Int"),
        scalarColumn("name", "String"),
        scalarColumn("email", "String"),
      ]),
    ];

    const layout = await getLayout(nodes, []);
    const layoutNode = layout.children![0]!;
    const expectedHeight = 3 * FIELD_HEIGHT + FIELD_HEIGHT + MARGIN * 2;

    expect(layoutNode.height).toBe(expectedHeight);
  });

  it("scales enum width with the longest value", async () => {
    const nodes = [baseEnumNode("Role", ["USER", "ADMINISTRATOR"])];

    const layout = await getLayout(nodes, []);
    const layoutNode = layout.children![0]!;
    const expectedWidth = "ADMINISTRATOR".length * CHAR_WIDTH + MARGIN * 2;

    expect(layoutNode.width).toBe(expectedWidth);
  });

  it("clamps enum height at MAX_ENUM_HEIGHT", async () => {
    const values = Array.from({ length: 100 }, (_, index) => `VALUE_${index}`);
    const nodes = [baseEnumNode("HugeEnum", values)];

    const layout = await getLayout(nodes, []);
    const layoutNode = layout.children![0]!;

    expect(layoutNode.height).toBe(MAX_ENUM_HEIGHT + MARGIN * 2);
  });
});
