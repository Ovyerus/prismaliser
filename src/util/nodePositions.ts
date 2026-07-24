import type { NodePosition } from "~/util/types";

interface PositionedNode {
  id: string;
  position: {
    x: number;
    y: number;
  };
}

const normaliseNodePositions = (
  positions: readonly NodePosition[],
): NodePosition[] =>
  positions
    .map(({ id, x, y }) => ({
      id,
      x: Math.round(x),
      y: Math.round(y),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

export const captureNodePositions = (
  nodes: readonly PositionedNode[],
): NodePosition[] =>
  normaliseNodePositions(
    nodes.map(({ id, position }) => ({
      id,
      x: position.x,
      y: position.y,
    })),
  );

export const applyNodePositions = <NodeType extends PositionedNode>(
  nodes: readonly NodeType[],
  positions: readonly NodePosition[],
): NodeType[] => {
  const positionsById = new Map(
    positions.map(({ id, x, y }) => [id, { x, y }] as const),
  );

  return nodes.map((node) => {
    const position = positionsById.get(node.id);

    return position ? { ...node, position: { ...position } } : node;
  });
};

export const sameNodePositions = (
  left: readonly NodePosition[],
  right: readonly NodePosition[],
): boolean => {
  if (left.length !== right.length) return false;

  const normalisedLeft = normaliseNodePositions(left);
  const normalisedRight = normaliseNodePositions(right);

  return normalisedLeft.every(
    (position, index) =>
      position.id === normalisedRight[index]?.id &&
      position.x === normalisedRight[index]?.x &&
      position.y === normalisedRight[index]?.y,
  );
};
