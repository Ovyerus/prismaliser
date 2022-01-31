import cc from "classcat";
import React from "react";
import { Handle, Position } from "react-flow-renderer";

import styles from "./Node.module.scss";

import { ModelNodeData } from "~/util/types";

type ColumnData = ModelNodeData["columns"][number];

const isTarget = ({
  kind,
  isList,
  relationFromFields,
  relationName,
  relationType,
}: ColumnData) =>
  kind === "enum" ||
  ((relationType === "1-n" || relationType === "m-n") && !isList) ||
  (relationType === "1-1" && !relationFromFields?.length) ||
  // Fallback for implicit m-n tables (maybe they should act like the child in a
  // 1-n instead)
  (kind === "scalar" && !!relationName);

const isSource = ({ isList, relationFromFields, relationType }: ColumnData) =>
  ((relationType === "1-n" || relationType === "m-n") && isList) ||
  (relationType === "1-1" && !!relationFromFields?.length);

const ModelNode = ({ data }: ModelNodeProps) => (
  <table
    className="font-sans bg-white border-2 border-separate border-black rounded-lg"
    style={{ minWidth: 200, maxWidth: 500, borderSpacing: 0 }}
  >
    <thead>
      <tr>
        <th
          className="p-2 font-extrabold bg-gray-200 border-b-2 border-black rounded-t-md"
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
      {data.columns.map((col) => (
        <tr key={col.name} className={styles.row}>
          <td className="font-mono font-semibold border-t-2 border-r-2 border-gray-300">
            <div className="relative p-2">
              {col.name}
              {isTarget(col) && (
                <Handle
                  key={`${data.name}-${col.relationName || col.name}`}
                  className={cc([styles.handle, styles.left])}
                  type="target"
                  id={`${data.name}-${col.relationName || col.name}`}
                  position={Position.Left}
                  isConnectable={false}
                />
              )}
            </div>
          </td>
          <td className="p-2 font-mono border-t-2 border-r-2 border-gray-300">
            {col.type}
          </td>
          <td className="font-mono border-t-2 border-gray-300">
            <div className="relative p-2">
              {col.defaultValue || ""}
              {isSource(col) && (
                <Handle
                  key={`${data.name}-${col.relationName}-${col.name}`}
                  className={cc([styles.handle, styles.right])}
                  type="source"
                  id={`${data.name}-${col.relationName}-${col.name}`}
                  position={Position.Right}
                  isConnectable={false}
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
