import React, { useEffect, useId, useRef, useState } from "react";

import styles from "./Sharing.module.css";

export interface AccountMenuProps {
  account: { did: string; handle?: string };
  onDisconnect(): void;
  onOpenShares(): void;
}

const AccountMenu = ({
  account,
  onDisconnect,
  onOpenShares,
}: AccountMenuProps) => {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const identity = account.handle ?? account.did;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      )
        setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const openShares = () => {
    setOpen(false);
    onOpenShares();
  };
  const disconnect = () => {
    setOpen(false);
    onDisconnect();
  };

  return (
    <div ref={containerRef} className={styles.account}>
      <button
        ref={triggerRef}
        aria-controls={menuId}
        aria-expanded={open}
        className={styles.accountButton}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        {identity}
      </button>

      {open ? (
        <div className={styles.menu} id={menuId}>
          <div className={styles.identity}>
            <p className={styles.identityValue}>{identity}</p>
            <p className={styles.identityLabel}>Atmosphere</p>
          </div>
          <div className={styles.menuActions}>
            <button
              className={styles.menuAction}
              type="button"
              onClick={openShares}
            >
              My shares
            </button>
            <button
              className={`${styles.menuAction} ${styles.danger}`}
              type="button"
              onClick={disconnect}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AccountMenu;
