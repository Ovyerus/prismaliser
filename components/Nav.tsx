import github from "@iconify/icons-simple-icons/github";
import prisma from "@iconify/icons-simple-icons/prisma";
import twitter from "@iconify/icons-simple-icons/twitter";
import { Icon } from "@iconify/react";
import Image from "next/image";
import React from "react";

const Nav = () => (
  <nav
    className="flex items-center w-full py-4 pl-5 pr-4 text-white bg-gray-600"
    style={{ gridArea: "nav" }}
  >
    <Image src="/img/logo.svg" alt="Prismaliser" width={200} height={20} />

    <div className="flex-1" />

    <div className="flex items-center gap-4">
      <a
        className="button icon light"
        href="https://prisma.io"
        title="Prisma"
        aria-label="Prisma"
      >
        <Icon icon={prisma} height={24} />
      </a>

      <a
        className="button icon light"
        href="https://github.com/Ovyerus/prismaliser"
        title="Prismaliser GitHub"
        aria-label="Prismaliser GitHub"
      >
        <Icon icon={github} height={24} />
      </a>
      <a
        className="button icon light"
        href="https://twitter.com/Ovyerus"
        title="Prismaliser Twitter"
        aria-label="Prismaliser Twitter"
      >
        <Icon icon={twitter} height={24} />
      </a>
    </div>
  </nav>
);

export default Nav;
