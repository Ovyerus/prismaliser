import React from "react";

import styles from "./Sharing.module.css";

import CloseIcon from "~icons/gg/close";
import CopyIcon from "~icons/gg/copy";

export interface SnapshotBarProps {
  label: string;
  author: string;
  createdAt: string;
  status: "deleted" | "modified" | "original";
  onCopyOriginal(): void;
  onDetachShare(): void;
}

const SnapshotBar = ({
  author,
  createdAt,
  label,
  onCopyOriginal,
  onDetachShare,
  status,
}: SnapshotBarProps) => (
  <div className={styles.snapshotBar} role="status">
    <div className={styles.snapshotCopy}>
      <strong>{label}</strong>
      <span>
        Shared by {author} · {new Date(createdAt).toLocaleDateString()}
      </span>
      {status === "modified" ? <em>Modified locally</em> : null}
      {status === "deleted" ? <em>Deleted from repository</em> : null}
    </div>
    <div className={styles.snapshotActions}>
      <button
        className={styles.snapshotAction}
        type="button"
        onClick={onCopyOriginal}
      >
        <CopyIcon height={18} width={18} />
        Copy original link
      </button>
      <button
        className={styles.snapshotAction}
        type="button"
        onClick={onDetachShare}
      >
        <CloseIcon height={18} width={18} />
        Close share
      </button>
    </div>
  </div>
);

export default SnapshotBar;
