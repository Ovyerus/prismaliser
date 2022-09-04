/* eslint-disable react/no-unknown-property */
import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
} from "react-flow-renderer";

import EnumNode from "~/components/EnumNode";
import ModelNode from "~/components/ModelNode";
import RelationEdge from "~/components/RelationEdge";
import { dmmfToElements } from "~/util/dmmfToElements";
import { DMMFToElementsResult } from "~/util/types";

import type { DMMF } from "@prisma/generator-helper";

const nodeTypes = {
  model: ModelNode,
  enum: EnumNode,
};

const edgeTypes = {
  relation: RelationEdge,
};

const FlowView = ({ dmmf }: FlowViewProps) => {
  // TODO: move to controlled nodes/edges, and change this to generate a NodeChanges[] as a diff so that positions gets preserved.
  // Will be more complex but gives us better control over how they're handled, and makes storing locations EZ.
  // https://reactflow.dev/docs/guides/migrate-to-v10/#11-controlled-nodes-and-edges
  const { nodes, edges } = useMemo(
    () =>
      dmmf
        ? dmmfToElements(dmmf)
        : ({ nodes: [], edges: [] } as DMMFToElementsResult),
    [dmmf]
  );

  return (
    <>
      <ReactFlow
        defaultNodes={nodes}
        defaultEdges={edges}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        minZoom={0.1}
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
