import Elk, { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk.bundled";
import { Edge, Node } from "reactflow";

import { EnumNodeData, ModelNodeData } from "./types";

const elk = new Elk({
  defaultLayoutOptions: {
    "elk.algorithm": "layered",
    "elk.direction": "DOWN",
    "elk.spacing.nodeNode": "75",
    "elk.layered.spacing.nodeNodeBetweenLayers": "75",
  },
});

const MAX_ENUM_HEIGHT = 600;
const FIELD_HEIGHT = 50;
const CHAR_WIDTH = 10;
const MIN_SIZE = 100;
const MARGIN = 50;

/** Normalises dimension to be at least MIN_SIZE plus MARGIN on both sides */
const normalizeSize = (value: number) => Math.max(value, MIN_SIZE) + MARGIN * 2;

/**
 * Calculates node height based on number of fields.
 * For enums max height is MAX_ENUM_HEIGHT being height of a folded enum values
 */
const calculateHeight = (node: Node<EnumNodeData> | Node<ModelNodeData>) => {
  if (node.data.type === "enum") {
    const fieldsHeight = node.data.values.length * FIELD_HEIGHT;
    const height =
      fieldsHeight > MAX_ENUM_HEIGHT
        ? MAX_ENUM_HEIGHT
        : fieldsHeight + FIELD_HEIGHT;

    return normalizeSize(height);
  }

  const fieldsHeight = node.data.columns.length * FIELD_HEIGHT;
  const heightWithTitle = fieldsHeight + FIELD_HEIGHT;

  return normalizeSize(heightWithTitle);
};

/**
 * Calculates node width based on column text lengths (CHAR_WIDTH per character in a text field)
 */
const calculateWidth = (node: Node<EnumNodeData> | Node<ModelNodeData>) => {
  if (node.data.type === "enum") {
    const width =
      node.data.values.reduce(
        (acc, curr) => (acc < curr.length ? curr.length : acc),
        node.data.name.length + (node.data.dbName?.length || 0),
      ) * CHAR_WIDTH;

    return normalizeSize(width);
  }

  const headerLength = node.data.name.length + (node.data.dbName?.length || 0);

  const [nameLength, typeLength, defaultValueLength] = node.data.columns.reduce(
    (acc, curr) => {
      const currDefaultValueLength = curr.defaultValue?.length || 0;

      return [
        acc[0] < curr.name.length ? curr.name.length : acc[0],
        acc[1] < curr.type.length ? curr.type.length : acc[1],
        acc[2] < currDefaultValueLength ? currDefaultValueLength : acc[2],
      ];
    },
    [0, 0, 0],
  );

  const columnsLength = nameLength + typeLength + defaultValueLength;

  const width =
    headerLength > columnsLength
      ? headerLength * CHAR_WIDTH
      : columnsLength * CHAR_WIDTH;

  return normalizeSize(width);
};

export const getLayout = async (
  nodes: Array<Node<EnumNodeData> | Node<ModelNodeData>>,
  edges: Edge[],
) => {
  const elkNodes: ElkNode[] = [];
  const elkEdges: ElkExtendedEdge[] = [];

  nodes.forEach((node) => {
    elkNodes.push({
      id: node.id,
      width: calculateWidth(node),
      height: calculateHeight(node),
    });
  });

  edges.forEach((edge) => {
    elkEdges.push({
      id: edge.id,
      targets: [edge.target],
      sources: [edge.source],
    });
  });

  const layout = await elk.layout({
    id: "root",
    children: elkNodes,
    edges: elkEdges,
  });

  return layout;
};
