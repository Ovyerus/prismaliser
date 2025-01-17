import cc from "classcat";
import React, { useState } from "react";
import { Handle, Position } from "reactflow";

import styles from "./Node.module.scss";

import { EnumNodeData } from "~/util/types";

const MAX_VALUES = 12;

const EnumNode = ({ data }: EnumNodeProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <table
      className="font-sans bg-white dark:bg-gray-800 border-2 border-separate border-black dark:border-gray-700 rounded-lg"
      style={{ minWidth: 200, maxWidth: 500, borderSpacing: 0 }}
    >
      <thead title={data.documentation}>
        <tr>
          <th
            className="p-2 font-extrabold border-b-2 border-black dark:border-gray-600 bg-emerald-200 dark:bg-emerald-600 rounded-t-md"
            colSpan={1}
          >
            {data.name}
            {!!data.dbName && (
              <span className="font-mono font-normal text-gray-800 dark:text-gray-200">
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
            <td className="flex p-2 font-mono border-t-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300">
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
                type="button"
                className="w-full px-4 py-2 font-semibold bg-blue-200 dark:bg-blue-600 rounded text-gray-800 dark:text-gray-200 hover:bg-blue-300 dark:hover:bg-blue-700"
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
