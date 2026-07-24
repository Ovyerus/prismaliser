import cc from "classcat";
import React from "react";

import styles from "./Layout.module.css";
import Nav from "./Nav";

import type { NavProps } from "./Nav";

export interface LayoutProps extends NavProps {
  children: React.ReactNode;
  noEditor?: boolean;
}

const Layout = ({
  account,
  atprotoAvailable,
  children,
  noEditor = false,
  onConnect,
  onDisconnect,
  onOpenShares,
}: LayoutProps) => (
  <main
    className={cc([
      styles.grid,
      "relative",
      "h-screen",
      "w-screen",
      { [styles.noEditor!]: noEditor },
    ])}
  >
    <Nav
      account={account}
      atprotoAvailable={atprotoAvailable}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      onOpenShares={onOpenShares}
    />
    {children}
  </main>
);

export default Layout;
