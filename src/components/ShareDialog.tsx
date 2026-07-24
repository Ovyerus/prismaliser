import React, { useEffect, useRef, useState } from "react";

import styles from "./Sharing.module.css";

import Dialog from "~/components/Dialog";

import CloseIcon from "~icons/gg/close";

export interface ShareDialogProps {
  accountConnected: boolean;
  error?: string;
  manualLink?: string;
  open: boolean;
  pending: boolean;
  onClose(): void;
  onConnect(name?: string): void;
  onCopyLegacy(): void;
  onPublish(name?: string): void;
}

const ShareDialog = ({
  accountConnected,
  error,
  manualLink,
  open,
  pending,
  onClose,
  onConnect,
  onCopyLegacy,
  onPublish,
}: ShareDialogProps) => {
  const [name, setName] = useState("");
  const [legacyCopied, setLegacyCopied] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const manualLinkRef = useRef<HTMLInputElement>(null);
  const copiedTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) nameInputRef.current?.focus();
    else setLegacyCopied(false);
  }, [open]);

  useEffect(() => {
    if (!manualLink) return;

    manualLinkRef.current?.focus();
    manualLinkRef.current?.select();
  }, [manualLink]);

  useEffect(
    () => () => {
      clearTimeout(copiedTimerRef.current ?? undefined);
    },
    [],
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const snapshotName = name.trim() || undefined;
    if (accountConnected) onPublish(snapshotName);
    else onConnect(snapshotName);
  };

  const copyLegacy = async () => {
    try {
      await Promise.resolve(onCopyLegacy());
    } catch {
      return;
    }

    clearTimeout(copiedTimerRef.current ?? undefined);
    setLegacyCopied(true);
    copiedTimerRef.current = setTimeout(() => setLegacyCopied(false), 2000);
  };

  return (
    <Dialog
      descriptionId="share-dialog-description"
      open={open}
      titleId="share-dialog-title"
      onClose={onClose}
    >
      <div className={styles.dialogBody}>
        <div className={styles.headingRow}>
          <div className={styles.headingCopy}>
            <h2 className={styles.title} id="share-dialog-title">
              Share diagram
            </h2>
            <p className={styles.description} id="share-dialog-description">
              Publish a snapshot containing the current schema and node
              positions.
            </p>
          </div>
          <button
            aria-label="Close share dialog"
            className={styles.closeButton}
            disabled={pending}
            type="button"
            onClick={onClose}
          >
            <CloseIcon height={22} width={22} />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="snapshot-name">
              Name (optional)
            </label>
            <input
              ref={nameInputRef}
              className={styles.input}
              disabled={pending}
              id="snapshot-name"
              maxLength={80}
              name="name"
              placeholder="Customer database"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <p className={styles.helper}>
              Publishing always creates a new record. Existing snapshots are
              never changed.
            </p>
          </div>

          <div className={styles.warning} role="note">
            <p className={styles.warningTitle}>Shared schemas are public</p>
            <p>
              Check this schema for passwords, connection strings, and other
              secrets before publishing it to your public repository.
            </p>
          </div>

          {error ? (
            <p className={styles.alert} role="alert">
              {error}
            </p>
          ) : null}

          {manualLink ? (
            <div className={styles.manualLink}>
              <label className={styles.label} htmlFor="manual-share-link">
                Published successfully, but the link could not be copied
              </label>
              <p className={styles.helper}>
                Copy this link manually. Prismaliser will not publish another
                record automatically.
              </p>
              <input
                ref={manualLinkRef}
                className={styles.input}
                id="manual-share-link"
                type="text"
                value={manualLink}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
          ) : null}

          <div className={styles.actions}>
            <button className={styles.primary} disabled={pending} type="submit">
              {accountConnected
                ? "Publish and copy link"
                : "Connect to publish"}
            </button>
            <button
              className={styles.secondary}
              disabled={pending}
              type="button"
              onClick={copyLegacy}
            >
              {legacyCopied
                ? "Copied!"
                : "Copy a schema-only link without publishing"}
            </button>
          </div>
          {pending ? (
            <p aria-live="polite" className={styles.srOnly} role="status">
              {accountConnected ? "Publishing…" : "Connecting…"}
            </p>
          ) : null}
        </form>
      </div>
    </Dialog>
  );
};

export default ShareDialog;
