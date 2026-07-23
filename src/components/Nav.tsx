import React from "react";

import BlueskyIcon from "~icons/simple-icons/bluesky";
import GithubIcon from "~icons/simple-icons/github";
import PrismaIcon from "~icons/simple-icons/prisma";

const Nav = () => (
  <nav
    className="flex items-center w-full py-4 pl-5 pr-4 text-white bg-gray-600"
    style={{ gridArea: "nav" }}
  >
    <img src="/img/logo.svg" alt="Prismaliser" width={200} height={20} />

    <div className="flex-1" />

    <div className="flex items-center gap-4">
      <a
        className="button icon light"
        href="https://prisma.io"
        title="Prisma website"
        aria-label="Prisma website"
      >
        <PrismaIcon height={24} width={24} />
      </a>

      <a
        className="button icon light"
        href="https://github.com/Ovyerus/prismaliser"
        title="Prismaliser GitHub repository"
        aria-label="Prismaliser GitHub repository"
      >
        <GithubIcon height={24} width={24} />
      </a>
      <a
        className="button icon light"
        href="https://bsky.app/profile/ovyerus.com"
        title="Author's Bluesky account"
        aria-label="Author's Bluesky account"
      >
        <BlueskyIcon height={24} width={24} />
      </a>
    </div>
  </nav>
);

export default Nav;
