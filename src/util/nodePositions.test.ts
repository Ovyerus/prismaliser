import { describe, expect, it } from "vitest";

import {
  applyNodePositions,
  captureNodePositions,
  sameNodePositions,
} from "~/util/nodePositions";

const nodes = [
  { id: "B", position: { x: 2.6, y: 5.4 } },
  { id: "A", position: { x: 10.2, y: -1.6 } },
];

describe("node positions", () => {
  it("captures rounded positions sorted by node ID", () => {
    expect(captureNodePositions(nodes)).toEqual([
      { id: "A", x: 10, y: -2 },
      { id: "B", x: 3, y: 5 },
    ]);
  });

  it("applies only positions for generated node IDs", () => {
    const applied = applyNodePositions(nodes, [
      { id: "A", x: 40, y: 50 },
      { id: "Missing", x: 100, y: 200 },
    ]);
    expect(applied.find(({ id }) => id === "A")?.position).toEqual({
      x: 40,
      y: 50,
    });
    expect(applied).toHaveLength(2);
  });

  it("compares integer-normalised positions without depending on order", () => {
    expect(
      sameNodePositions(
        [
          { id: "B", x: 3.2, y: 4.2 },
          { id: "A", x: 1.2, y: 2.2 },
        ],
        [
          { id: "A", x: 1, y: 2 },
          { id: "B", x: 3, y: 4 },
        ],
      ),
    ).toBe(true);
  });
});
