import cc from "classcat";
import React from "react";
import { Handle, Position } from "react-flow-renderer";
import { EnumNodeData } from "~/util/types";

import styles from "./Node.module.scss";

const EnumNode = ({ data }: EnumNodeProps) => (
  <table
    className="border-2 border-black bg-white font-sans border-separate rounded-lg"
    style={{ minWidth: 200, maxWidth: 500, borderSpacing: 0 }}
  >
    <thead>
      <tr>
        <th
          className="border-b-2 border-black bg-green-200 p-2 font-extrabold rounded-t-md"
          colSpan={1}
        >
          {data.name}
          {!!data.dbName && (
            <span className="font-mono font-normal">&nbsp;({data.dbName})</span>
          )}
        </th>
      </tr>
    </thead>
    <tbody>
      {data.values.map((val) => (
        <tr key={val} className={styles.row}>
          <td className="p-2 border-t-2 border-gray-300 font-mono">{val}</td>
        </tr>
      ))}
    </tbody>

    <Handle
      className={cc([styles.handle, styles.bottom])}
      type="source"
      position={Position.Bottom}
    />
  </table>
);

export interface EnumNodeProps {
  data: EnumNodeData;
}

export default EnumNode;
