import React from "react";
import { Handle } from "react-flow-renderer";

import styles from "./Node.module.scss";

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
      {data.columns.map(({ name, type, defaultValue }) => (
        <tr className={styles.row}>
          <td className="p-2 border-t-2 border-r-2 border-gray-300 font-mono font-semibold">
            {name}
          </td>
          <td className="p-2 border-t-2 border-r-2 border-gray-300">{type}</td>
          <td className="p-2 border-t-2 border-gray-300 font-mono">
            {defaultValue || ""}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export interface ModelNodeProps {
  data: {
    name: string;
    dbName?: string | null;
    columns: Array<{
      name: string;
      type: string;
      defaultValue?: string | null;
    }>;
    // relations: []
  };
}

export default ModelNode;
