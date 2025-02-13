import cc from "classcat";
import React, { JSX } from "react";
import { Handle, Position, useReactFlow, useStoreApi } from "reactflow";

import styles from "./Node.module.scss";

import {
  enumEdgeTargetHandleId,
  relationEdgeSourceHandleId,
  relationEdgeTargetHandleId,
} from "~/util/prismaToFlow";
import { ModelNodeData } from "~/util/types";

type ColumnData = ModelNodeData["columns"][number];

const isRelationed = ({ relationData }: ColumnData) => !!relationData?.side;

const ModelNode = ({ data }: ModelNodeProps) => {
  const store = useStoreApi();
  const { setCenter, getZoom } = useReactFlow();

  const focusNode = (nodeId: string) => {
    const { nodeInternals } = store.getState();
    const nodes = Array.from(nodeInternals).map(([, node]) => node);

    if (nodes.length > 0) {
      const node = nodes.find((iterNode) => iterNode.id === nodeId);

      if (!node) return;

      const x = node.position.x + node.width! / 2;
      const y = node.position.y + node.height! / 2;
      const zoom = getZoom();

      setCenter(x, y, { zoom, duration: 1000 });
    }
  };

  return (
    <table
      className="font-sans bg-white dark:bg-gray-800 border-2 border-separate border-black dark:border-gray-600 rounded-lg"
      style={{ minWidth: 200, maxWidth: 500, borderSpacing: 0 }}
    >
      <thead title={data.documentation}>
        <tr>
          <th
            className="p-2 font-extrabold bg-gray-200 dark:bg-gray-700 border-b-2 border-black dark:border-gray-600 rounded-t-md"
            colSpan={4}
          >
            {data.name}
            {!!data.dbName && (
              <span className="font-mono font-normal">
                &nbsp;({data.dbName})
              </span>
            )}
          </th>
        </tr>
      </thead>
      <tbody>
        {data.columns.map((col) => {
          const reled = isRelationed(col);
          let targetHandle: JSX.Element | null = null;
          let sourceHandle: JSX.Element | null = null;

          if (col.kind === "enum") {
            const handleId = enumEdgeTargetHandleId(data.name, col.name);
            targetHandle = (
              <Handle
                key={handleId}
                className={cc([styles.handle, styles.left])}
                type="target"
                id={handleId}
                position={Position.Left}
                isConnectable={false}
              />
            );
          } else if (col.relationData) {
            const targetHandleId = relationEdgeTargetHandleId(
              data.name,
              col.relationData.name,
              col.name,
            );
            const sourceHandleId = relationEdgeSourceHandleId(
              data.name,
              col.relationData.name,
              col.name,
            );

            targetHandle =
              col.relationData.side === "target" ? (
                <Handle
                  key={targetHandleId}
                  className={cc([styles.handle, styles.left])}
                  type="target"
                  id={targetHandleId}
                  position={Position.Left}
                  isConnectable={false}
                />
              ) : null;
            sourceHandle =
              col.relationData.side === "source" ? (
                <Handle
                  key={sourceHandleId}
                  className={cc([styles.handle, styles.right])}
                  type="source"
                  id={sourceHandleId}
                  position={Position.Right}
                  isConnectable={false}
                />
              ) : null;
          }

          return (
            <tr key={col.name} className={styles.row} title={col.documentation}>
              <td className="font-mono font-semibold border-t-2 border-r-2 border-gray-300 dark:border-gray-600">
                <button
                  type="button"
                  className={cc([
                    "relative",
                    "p-2",
                    { "cursor-pointer": reled },
                    "text-gray-700 dark:text-gray-300",
                  ])}
                  onClick={() => {
                    if (!reled) return;
                    focusNode(col.type);
                  }}
                >
                  {col.name}
                  {targetHandle}
                </button>
              </td>
              <td className="p-2 font-mono border-t-2 border-r-2 border-gray-300 dark:border-gray-600">
                {col.displayType}
              </td>
              <td className="font-mono border-t-2 border-gray-300 dark:border-gray-600">
                <div className="relative p-2">
                  {col.defaultValue || ""}
                  {sourceHandle}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export interface ModelNodeProps {
  data: ModelNodeData;
}

export default ModelNode;
