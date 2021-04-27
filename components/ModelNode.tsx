import cc from "classcat";
import React from "react";
import { Handle, Position } from "react-flow-renderer";
import { ModelNodeData } from "~/util/types";

import styles from "./Node.module.scss";

type ColumnData = ModelNodeData["columns"][number];

const hasLeftHandle = ({ kind, isList, isRequired }: ColumnData) =>
  // TODO: is dependent
  kind === "enum" || (kind === "object" && !isList && !isRequired);

const hasRightHandle = ({ kind, isList, isRequired }: ColumnData) =>
  // TODO: is owner
  kind === "object" && (isList || isRequired);

const ModelNode = ({ data }: ModelNodeProps) => (
  <table
    className="border-2 border-black bg-white font-sans border-separate rounded-lg"
    style={{ minWidth: 200, maxWidth: 500, borderSpacing: 0 }}
  >
    <thead>
      <tr>
        <th
          className="border-b-2 border-black bg-gray-200 p-2 font-extrabold rounded-t-md"
          colSpan={4}
        >
          {data.name}
          {!!data.dbName && (
            <span className="font-mono font-normal">&nbsp;({data.dbName})</span>
          )}
        </th>
      </tr>
    </thead>
    <tbody>
      {data.columns.map((col, i) => (
        <tr className={styles.row}>
          <td className="border-t-2 border-r-2 border-gray-300 font-mono font-semibold">
            <div className="p-2 relative">
              {col.name}
              {hasLeftHandle(col) && (
                <Handle
                  className={cc([styles.handle, styles.left])}
                  type="target"
                  id={`${data.name}-${col.relationName || col.name}`}
                  position={Position.Left}
                />
              )}
            </div>
          </td>
          <td className="p-2 border-t-2 border-r-2 border-gray-300 font-mono">
            {col.type}
          </td>
          <td className="border-t-2 border-gray-300 font-mono">
            <div className="p-2 relative">
              {col.defaultValue || ""}
              {hasRightHandle(col) && (
                <Handle
                  className={cc([styles.handle, styles.right])}
                  type="source"
                  id={`${data.name}-${col.relationName}`}
                  position={Position.Right}
                />
              )}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
export interface ModelNodeProps {
  data: ModelNodeData;
}

export default ModelNode;
