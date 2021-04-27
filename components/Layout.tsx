import cc from "classcat";
import React from "react";

import styles from "./Layout.module.scss";
import Nav from "./Nav";

const Layout = ({ children }: LayoutProps) => (
  <main className={cc([styles.grid, "relative", "h-screen", "w-screen"])}>
    <Nav />
    {children}
  </main>
);

interface LayoutProps {
  children: React.ReactNode;
}

export default Layout;
