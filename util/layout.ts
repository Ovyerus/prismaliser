import Elk, { ElkNode, ElkPrimitiveEdge } from "elkjs/lib/elk.bundled";
import { Edge, Node } from "react-flow-renderer";

import { EnumNodeData, ModelNodeData } from "./types";

const elk = new Elk({
  defaultLayoutOptions: {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.spacing.nodeNode": "75",
    "elk.layered.spacing.nodeNodeBetweenLayers": "75",
  },
});

const MAX_ENUM_HEIGHT = 600;
const FIELD_HEIGHT = 50;
const CHAR_BASED_WIDTH = 10;

const calculateHeight = (node: Node<EnumNodeData> | Node<ModelNodeData>) => {
  if (node.data.type === "enum") {
    const fieldsHeight = node.data.values.length * FIELD_HEIGHT;
    return fieldsHeight > MAX_ENUM_HEIGHT
      ? MAX_ENUM_HEIGHT
      : fieldsHeight + FIELD_HEIGHT;
  }

  const fieldsHeight = node.data.columns.length * FIELD_HEIGHT;
  return fieldsHeight + FIELD_HEIGHT;
};

const calculateWidth = (node: Node<EnumNodeData> | Node<ModelNodeData>) => {
  if (node.data.type === "enum")
    return (
      node.data.values.reduce(
        (acc, curr) => (acc < curr.length ? curr.length : acc),
        node.data.name.length + (node.data.dbName?.length || 0)
      ) * CHAR_BASED_WIDTH
    );

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
    [0, 0, 0]
  );

  const columnsLength = nameLength + typeLength + defaultValueLength;

  return headerLength > columnsLength
    ? headerLength * CHAR_BASED_WIDTH
    : columnsLength * CHAR_BASED_WIDTH;
};

export const resetLayout = async (
  nodes: Array<Node<EnumNodeData> | Node<ModelNodeData>>,
  edges: Edge[]
) => {
  const elkNodes: ElkNode[] = [];
  const elkEdges: ElkPrimitiveEdge[] = [];

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
      target: edge.target,
      source: edge.source,
    });
  });

  const layout = await elk.layout({
    id: "root",
    children: elkNodes,
    edges: elkEdges,
  });

  return layout;
};
