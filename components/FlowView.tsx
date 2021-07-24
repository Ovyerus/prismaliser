import type { DMMF } from "@prisma/generator-helper";
import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Node,
} from "react-flow-renderer";

import EnumNode from "~/components/EnumNode";
import ModelNode from "~/components/ModelNode";
import RelationEdge from "~/components/RelationEdge";
import { mapDatamodelToNodes } from "~/util";

const nodeTypes = {
  model: ModelNode,
  enum: EnumNode,
};

const edgeTypes = {
  relation: RelationEdge,
};

const FlowView = ({ dmmf }: FlowViewProps) => {
  const elements = useMemo(
    () => (dmmf ? mapDatamodelToNodes(dmmf) : []),
    [dmmf]
  );

  const onNodeDragStop = (_, node: Node) => {};

  return (
    <>
      <ReactFlow
        elements={elements}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        onNodeDragStop={onNodeDragStop}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={2}
          color="currentColor"
          className="text-gray-200"
        />
        <Controls />
      </ReactFlow>
      <svg width="0" height="0">
        <defs>
          <marker
            id="prismaliser-one"
            markerWidth="12.5"
            markerHeight="12.5"
            viewBox="-10 -10 20 20"
            orient="auto-start-reverse"
            refX="0"
            refY="0"
          >
            <polyline
              className="text-gray-400 stroke-current"
              strokeWidth="3"
              strokeLinecap="square"
              fill="none"
              points="-10,-8 -10,8"
            />
          </marker>

          <marker
            id="prismaliser-many"
            markerWidth="12.5"
            markerHeight="12.5"
            viewBox="-10 -10 20 20"
            orient="auto-start-reverse"
            refX="0"
            refY="0"
          >
            <polyline
              className="text-gray-400 stroke-current"
              strokeLinejoin="round"
              strokeLinecap="square"
              strokeWidth="1.5"
              fill="none"
              points="0,-8 -10,0 0,8"
            />
          </marker>
        </defs>
      </svg>
    </>
  );
};

export interface FlowViewProps {
  dmmf: DMMF.Datamodel | null;
}

export default FlowView;
