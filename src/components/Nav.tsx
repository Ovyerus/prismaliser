import React from "react";

import styles from "./Sharing.module.css";

import AccountMenu from "~/components/AccountMenu";

import BlueskyIcon from "~icons/simple-icons/bluesky";
import GithubIcon from "~icons/simple-icons/github";
import PrismaIcon from "~icons/simple-icons/prisma";

export interface NavProps {
  account: { did: string; handle?: string } | null;
  atprotoAvailable: boolean;
  onConnect(): void;
  onDisconnect(): void;
  onOpenShares(): void;
}

const Nav = ({
  account,
  atprotoAvailable,
  onConnect,
  onDisconnect,
  onOpenShares,
}: NavProps) => (
  <nav
    className="flex items-center w-full py-4 pl-5 pr-4 text-white bg-gray-600"
    style={{ gridArea: "nav" }}
  >
    <img alt="Prismaliser" height={20} src="/img/logo.svg" width={200} />

    <div className="flex-1" />

    <div className="flex items-center gap-4">
      {account ? (
        <AccountMenu
          account={account}
          onDisconnect={onDisconnect}
          onOpenShares={onOpenShares}
        />
      ) : (
        <div>
          <button
            aria-describedby={
              atprotoAvailable ? undefined : "atproto-unavailable-description"
            }
            className={styles.connectButton}
            disabled={!atprotoAvailable}
            title={
              atprotoAvailable
                ? undefined
                : "Account connection is unavailable on this deployment."
            }
            type="button"
            onClick={onConnect}
          >
            Login
          </button>
          {!atprotoAvailable ? (
            <span
              className={styles.srOnly}
              id="atproto-unavailable-description"
            >
              Account connection is unavailable because this deployment&apos;s
              OAuth metadata could not be verified.
            </span>
          ) : null}
        </div>
      )}

      <a
        aria-label="Prisma website"
        className="button icon light"
        href="https://prisma.io"
        title="Prisma website"
      >
        <PrismaIcon height={24} width={24} />
      </a>

      <a
        aria-label="Prismaliser GitHub repository"
        className="button icon light"
        href="https://github.com/Ovyerus/prismaliser"
        title="Prismaliser GitHub repository"
      >
        <GithubIcon height={24} width={24} />
      </a>
      <a
        aria-label="Author's Bluesky account"
        className="button icon light"
        href="https://bsky.app/profile/ovyerus.com"
        title="Author's Bluesky account"
      >
        <BlueskyIcon height={24} width={24} />
      </a>
    </div>
  </nav>
);

export default Nav;
