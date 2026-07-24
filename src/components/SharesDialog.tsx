import cc from "classcat";
import React, { useEffect, useMemo, useRef, useState } from "react";

import styles from "./Sharing.module.css";

import { createAtShareUrl } from "~/atproto/links";
import type { SnapshotPage, SnapshotSummary } from "~/atproto/types";
import Dialog from "~/components/Dialog";

import CloseIcon from "~icons/gg/close";

export interface SharesDialogProps {
  error?: string;
  loading: boolean;
  open: boolean;
  page: SnapshotPage;
  query: string;
  deletingUri?: string;
  onClose(): void;
  onCopy(uri: string): void;
  onDelete(uri: string): void;
  onLoadMore(): void;
  onOpen(uri: string): void;
  onQueryChange(query: string): void;
}

const visibleSnapshots = (page: SnapshotPage, query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return page.snapshots;

  return page.snapshots.filter(({ label, nodeIds }) => {
    if (label.toLowerCase().includes(needle)) return true;
    return nodeIds.some(
      (id) => !id.startsWith("_") && id.toLowerCase().includes(needle),
    );
  });
};

const SnapshotRow = ({
  deletingUri,
  onConfirmDelete,
  onCopy,
  onOpen,
  snapshot,
}: {
  deletingUri?: string;
  onConfirmDelete(): void;
  onCopy(): void;
  onOpen(): void;
  snapshot: SnapshotSummary;
}) => {
  const [confirming, setConfirming] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const isDeleting = confirming;
  const nodeLabel = snapshot.nodeIds
    .filter((id) => !id.startsWith("_"))
    .slice(0, 3)
    .join(", ");

  const copy = async () => {
    try {
      await Promise.resolve(onCopy());
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <li
      className={cc([
        styles.shareRow,
        isDeleting ? styles.shareRowCol : undefined,
      ])}
    >
      <div className={styles.shareRowCopy}>
        <strong>{snapshot.label}</strong>
        <span>
          {nodeLabel || "No named nodes"} ·{" "}
          {new Date(snapshot.createdAt).toLocaleDateString()}
        </span>
        {copyFailed ? (
          <input
            aria-label={`Link for ${snapshot.label}`}
            className={styles.input}
            type="text"
            value={createAtShareUrl(snapshot.uri)}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        ) : null}
      </div>
      {isDeleting ? (
        <div className={styles.shareConfirmation} role="alertdialog">
          <p>
            Delete {snapshot.label}? The canonical record will be deleted;
            cached copies may remain.
          </p>
          <button
            className={styles.dangerAction}
            disabled={deletingUri !== undefined}
            type="button"
            onClick={onConfirmDelete}
          >
            Confirm
          </button>
          <button
            className={styles.menuAction}
            type="button"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className={styles.shareActions}>
          <button className={styles.menuAction} type="button" onClick={onOpen}>
            Open
          </button>
          <button className={styles.menuAction} type="button" onClick={copy}>
            Copy
          </button>
          <button
            className={styles.dangerAction}
            type="button"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
};

const SharesDialog = ({
  deletingUri,
  error,
  loading,
  onClose,
  onCopy,
  onDelete,
  onLoadMore,
  onOpen,
  onQueryChange,
  open,
  page,
  query,
}: SharesDialogProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const visible = useMemo(() => visibleSnapshots(page, query), [page, query]);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  return (
    <Dialog
      descriptionId="shares-dialog-description"
      open={open}
      titleId="shares-dialog-title"
      onClose={onClose}
    >
      <div className={styles.dialogBody}>
        <div className={styles.headingRow}>
          <div className={styles.headingCopy}>
            <h2 className={styles.title} id="shares-dialog-title">
              My shares
            </h2>
            <p className={styles.description} id="shares-dialog-description">
              Published snapshots in your connected account.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            aria-label="Close my shares"
            className={styles.closeButton}
            type="button"
            onClick={onClose}
          >
            <CloseIcon height={22} width={22} />
          </button>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="shares-search">
            Search shares
          </label>
          <input
            className={styles.input}
            id="shares-search"
            placeholder="Name or model"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>

        {error ? (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        ) : null}
        {page.invalidCount > 0 ? (
          <p className={styles.helper} role="status">
            {page.invalidCount} invalid records were hidden
          </p>
        ) : null}

        <ul className={styles.shareList}>
          {visible.map((snapshot) => (
            <SnapshotRow
              key={snapshot.uri}
              deletingUri={deletingUri}
              snapshot={snapshot}
              onConfirmDelete={() => onDelete(snapshot.uri)}
              onCopy={() => onCopy(snapshot.uri)}
              onOpen={() => onOpen(snapshot.uri)}
            />
          ))}
        </ul>

        {visible.length === 0 && !loading ? (
          <p className={styles.helper}>
            {!query ? "You don't have any shares." : "No matching shares."}
          </p>
        ) : null}
        {page.cursor ? (
          <button
            className={styles.secondary}
            disabled={loading}
            type="button"
            onClick={onLoadMore}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        ) : null}
        {loading ? (
          <p aria-live="polite" className={styles.srOnly} role="status">
            Loading shares…
          </p>
        ) : null}
      </div>
    </Dialog>
  );
};

export default SharesDialog;
