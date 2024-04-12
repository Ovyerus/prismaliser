import cc from "classcat";
import React from "react";

import styles from "./Layout.module.scss";
import Nav from "./Nav";

const Layout = ({ children, noEditor = false }: LayoutProps) => (
  <main
    className={cc([
      styles.grid,
      "relative",
      "h-screen",
      "w-screen",
      { [styles.noEditor as any]: noEditor },
    ])}
  >
    <Nav noEditor={noEditor} />
    {children}
  </main>
);

interface LayoutProps {
  children: React.ReactNode;
  noEditor?: boolean;
}

export default Layout;
