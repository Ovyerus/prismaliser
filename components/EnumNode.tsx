import cc from "classcat";
import React, { useState } from "react";
import { Handle, Position } from "react-flow-renderer";

import styles from "./Node.module.scss";

import { EnumNodeData } from "~/util/types";

const MAX_VALUES = 12;

const EnumNode = ({ data }: EnumNodeProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <table
      className="font-sans bg-white border-2 border-separate border-black rounded-lg"
      style={{ minWidth: 200, maxWidth: 500, borderSpacing: 0 }}
    >
      <thead title={data.documentation}>
        <tr>
          <th
            className="p-2 font-extrabold border-b-2 border-black bg-emerald-200 rounded-t-md"
            colSpan={1}
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
      <tbody
        className={cc([
          "flex",
          "flex-col",
          "overflow-hidden",
          { "max-h-[500px]": !expanded && data.values.length > MAX_VALUES },
        ])}
      >
        {data.values.map((val) => (
          <tr key={val} className={styles.row}>
            <td className="p-2 font-mono border-t-2 border-gray-300 flex">
              {val}
            </td>
          </tr>
        ))}
      </tbody>
      {data.values.length > MAX_VALUES && (
        <tbody>
          <tr>
            <td className="flex">
              <button
                className="rounded bg-blue-200 font-semibold py-2 px-4 w-full"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Fold" : "Expand"}
              </button>
            </td>
          </tr>
        </tbody>
      )}

      <Handle
        className={cc([styles.handle, styles.bottom])}
        type="source"
        position={Position.Bottom}
        isConnectable={false}
      />
    </table>
  );
};

export interface EnumNodeProps {
  data: EnumNodeData;
}

export default EnumNode;
