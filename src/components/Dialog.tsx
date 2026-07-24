import React, { useEffect, useRef } from "react";

import styles from "./Dialog.module.css";

export interface DialogProps {
  children: React.ReactNode;
  descriptionId?: string;
  open: boolean;
  titleId: string;
  onClose(): void;
}

const Dialog = ({
  children,
  descriptionId,
  open,
  titleId,
  onClose,
}: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const closeRequestedRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const restoreFocus = () => {
      const restoreTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;
      restoreTarget?.focus();
    };

    if (open) {
      closeRequestedRef.current = false;
      if (!dialog.open) {
        restoreFocusRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        dialog.showModal();
      }
    } else {
      if (dialog.open) dialog.close();
      restoreFocus();
    }

    return () => {
      if (dialog.open) dialog.close();
      restoreFocus();
    };
  }, [open]);

  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    if (closeRequestedRef.current) return;

    closeRequestedRef.current = true;
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className={styles.dialog}
      onCancel={handleCancel}
    >
      <div className={styles.panel}>{children}</div>
    </dialog>
  );
};

export default Dialog;
