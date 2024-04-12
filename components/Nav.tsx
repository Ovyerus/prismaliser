import github from "@iconify/icons-simple-icons/github";
import mastodon from "@iconify/icons-simple-icons/mastodon";
import prisma from "@iconify/icons-simple-icons/prisma";
import { Icon } from "@iconify/react";
import cx from "classnames";
import Image from "next/image";
import React from "react";

interface Props {
  noEditor: boolean;
}

const Nav = ({ noEditor }: Props) => {
  const logoHeight = noEditor ? 10 : 20;
  const logoWidth = noEditor ? 100 : 200;

  return (
    <nav
      className={cx("flex items-center py-4 pl-5 pr-4 text-white bg-gray-600", {
        "py-4 w-full": !noEditor,
        "py-2 w-1/6": noEditor,
      })}
      style={{ gridArea: "nav" }}
    >
      <Image
        src="/img/logo.svg"
        alt="Prismaliser"
        width={logoWidth}
        height={logoHeight}
      />

      {!noEditor ? (
        <>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <a
              className="button icon light"
              href="https://prisma.io"
              title="Prisma website"
              aria-label="Prisma website"
            >
              <Icon icon={prisma} height={24} />
            </a>

            <a
              className="button icon light"
              href="https://github.com/Ovyerus/prismaliser"
              title="Prismaliser GitHub repository"
              aria-label="Prismaliser GitHub repository"
            >
              <Icon icon={github} height={24} />
            </a>
            <a
              className="button icon light"
              href="https://aus.social/@ovyerus"
              title="Author's Mastodon account"
              aria-label="Author's Mastodon account"
            >
              <Icon icon={mastodon} height={24} />
            </a>
          </div>
        </>
      ) : null}
    </nav>
  );
};

export default Nav;
