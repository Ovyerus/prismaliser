import doubleChevron from "@iconify/icons-gg/chevron-double-left";
import doubleChevronRight from "@iconify/icons-gg/chevron-double-right";
import listTree from "@iconify/icons-gg/list-tree";
import { Icon } from "@iconify/react";
import { ElkNode } from "elkjs/lib/elk.bundled";
import React, { useEffect, useState } from "react";
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
import { generateFlowFromDMMF } from "~/util/prismaToFlow";
import { DMMFToElementsResult } from "~/util/types";

import type { DMMF } from "@prisma/generator-helper";
import { useTheme } from "~/context/ThemeContext";

const nodeTypes = {
  model: ModelNode,
  enum: EnumNode,
};

const edgeTypes = {
  relation: RelationEdge,
};

const FlowView = ({ dmmf, toggleEditor, visible }: FlowViewProps) => {
  const { theme } = useTheme();
  const [nodes, setNodes] = useState<DMMFToElementsResult["nodes"]>([]);
  const [edges, setEdges] = useState<DMMFToElementsResult["edges"]>([]);

  const darkThemeStyles = {
    background: '#1a1a1a',
    color: '#fff',
    gridArea: "flow"
  };

  const regenerateNodes = (layout: ElkNode | null) => {
    const { nodes: newNodes, edges: newEdges } = dmmf
      ? generateFlowFromDMMF(dmmf, nodes, layout)
      : ({ nodes: [], edges: [] } as DMMFToElementsResult);

    // See if `applyNodeChanges` can work here?
    setNodes(newNodes);
    setEdges(newEdges);
  };

  const refreshLayout = async () => {
    const layout = await getLayout(nodes, edges);
    regenerateNodes(layout);
  };

  const onNodesChange: OnNodesChange = (changes) =>
    setNodes((nodes) => applyNodeChanges(changes, nodes as any) as any);

  useEffect(() => {
    regenerateNodes(null);
  }, [dmmf]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        minZoom={0.05}
        style={theme === 'dark' ? darkThemeStyles : { gridArea: "flow" }}
        onNodesChange={onNodesChange}
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
            <Icon className={theme === "dark" ? "text-black" : ""} icon={listTree} />
          </ControlButton>
          <DownloadButton />
        </Controls>

        <Controls
          className={theme === "dark" ? styles["controls-dark"] : styles["controls-light"]}
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
            {
              visible ? (
                <Icon className={theme === "dark" ? "text-black" : ""}
                  icon={doubleChevron}
                  height={24}
                  width={24} />
              ) : (
                <Icon
                  className={theme === "dark" ? "text-black" : ""}
                  icon={doubleChevronRight}
                  height={24}
                  width={24} />
              )
            }
          </ControlButton>
        </Controls>
      </ReactFlow >

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
};

export interface FlowViewProps {
  dmmf: DMMF.Datamodel | null;
  toggleEditor(): void;
  visible: boolean;
}

export default FlowView;
