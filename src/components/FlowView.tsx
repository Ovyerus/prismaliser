import { ElkNode } from "elkjs/lib/elk.bundled";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import ReactFlow, {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  OnNodesChange,
} from "reactflow";

import DownloadButton from "./DownloadButton";
import styles from "./FlowView.module.css";

import EnumNode from "~/components/EnumNode";
import ModelNode from "~/components/ModelNode";
import RelationEdge from "~/components/RelationEdge";
import { getLayout } from "~/util/layout";
import { applyNodePositions, captureNodePositions } from "~/util/nodePositions";
import { generateFlowFromDMMF } from "~/util/prismaToFlow";
import { DMMFToElementsResult, NodePosition } from "~/util/types";

import type { DMMF } from "@prisma/generator-helper";

import ChevronDoubleLeftIcon from "~icons/gg/chevron-double-left";
import ListTreeIcon from "~icons/gg/list-tree";

const nodeTypes = {
  model: ModelNode,
  enum: EnumNode,
};

const edgeTypes = {
  relation: RelationEdge,
};

const FlowView = forwardRef<FlowViewHandle, FlowViewProps>(
  (
    { dmmf, onPositionsChange, positionSeed, toggleEditor }: FlowViewProps,
    ref,
  ) => {
    const [nodes, setNodes] = useState<DMMFToElementsResult["nodes"]>([]);
    const [edges, setEdges] = useState<DMMFToElementsResult["edges"]>([]);
    const nodesRef = useRef<DMMFToElementsResult["nodes"]>([]);
    const lastAppliedPositionSeedKey = useRef<string | undefined>(undefined);

    const regenerateNodes = (
      layout: ElkNode | null,
      previousNodes = nodesRef.current,
      positions: readonly NodePosition[] | null = null,
    ) => {
      const { nodes: generatedNodes, edges: newEdges } = dmmf
        ? generateFlowFromDMMF(dmmf, previousNodes, layout)
        : ({ nodes: [], edges: [] } as DMMFToElementsResult);
      const newNodes = positions
        ? applyNodePositions(generatedNodes, positions)
        : generatedNodes;

      nodesRef.current = newNodes;
      setNodes(newNodes);
      setEdges(newEdges);

      return newNodes;
    };

    const refreshLayout = async () => {
      const layout = await getLayout(nodes, edges);
      const newNodes = regenerateNodes(layout);
      onPositionsChange?.(captureNodePositions(newNodes));
    };

    const onNodesChange: OnNodesChange = (changes) => {
      const changedNodes = applyNodeChanges<
        DMMFToElementsResult["nodes"][number]["data"]
      >(changes, nodesRef.current);
      // React Flow preserves each node's existing data variant.
      const newNodes = changedNodes as DMMFToElementsResult["nodes"];

      nodesRef.current = newNodes;
      setNodes(newNodes);
    };

    useImperativeHandle(ref, () => ({
      getPositions: () => captureNodePositions(nodesRef.current),
    }));

    useEffect(() => {
      const seedChanged =
        positionSeed !== undefined &&
        positionSeed.key !== lastAppliedPositionSeedKey.current;

      regenerateNodes(
        null,
        seedChanged ? [] : nodesRef.current,
        seedChanged ? positionSeed.positions : null,
      );

      if (dmmf && seedChanged)
        lastAppliedPositionSeedKey.current = positionSeed.key;
    }, [dmmf]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          edgeTypes={edgeTypes}
          nodeTypes={nodeTypes}
          minZoom={0.05}
          style={{ gridArea: "flow" }}
          onNodesChange={onNodesChange}
          onNodeDragStop={() =>
            onPositionsChange?.(captureNodePositions(nodesRef.current))
          }
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={2}
            color="currentColor"
            className="text-gray-200"
          />
          <Controls>
            <ControlButton title="Disperse nodes" onClick={refreshLayout}>
              <ListTreeIcon height={24} width={24} />
            </ControlButton>
            <DownloadButton />
          </Controls>

          <Controls
            position="top-left"
            showZoom={false}
            showFitView={false}
            showInteractive={false}
          >
            <ControlButton
              className={styles.noShrinkIcon}
              title="Hide editor"
              onClick={toggleEditor}
            >
              <ChevronDoubleLeftIcon height={24} width={24} />
            </ControlButton>
          </Controls>
        </ReactFlow>

        <svg width="0" height="0">
          <defs>
            <marker
              id="prismaliser-one"
              markerWidth="12.5"
              markerHeight="12.5"
              // eslint-disable-next-line react/no-unknown-property
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
              // eslint-disable-next-line react/no-unknown-property
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
  },
);

FlowView.displayName = "FlowView";

export interface FlowViewHandle {
  getPositions(): NodePosition[];
}

export interface FlowViewProps {
  dmmf: DMMF.Datamodel | null;
  onPositionsChange?(positions: NodePosition[]): void;
  positionSeed?: {
    key: string;
    positions: NodePosition[];
  };
  toggleEditor(): void;
}

export default FlowView;
