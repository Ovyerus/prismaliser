import github from "@iconify/icons-simple-icons/github";
import mastodon from "@iconify/icons-simple-icons/mastodon";
import moonIcon from '@iconify/icons-mdi/weather-night';
import sunIcon from '@iconify/icons-mdi/white-balance-sunny';
import prisma from "@iconify/icons-simple-icons/prisma";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { useTheme } from "~/context/ThemeContext";

const Nav = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav
      className="flex items-center w-full py-4 pl-5 pr-4 text-white bg-gray-600 dark:bg-gray-900"
      style={{ gridArea: "nav" }}
    >
      <Image src="/img/logo.svg" alt="Prismaliser" width={200} height={20} />

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <a
          className={`button icon ${theme === "dark" ? "dark" : "light"}`}
          href="#"
          title="Toggle Light/Dark Mode"
          aria-label="Toggle Light/Dark Mode"
          onClick={toggleTheme}
        >
          <Icon icon={theme === "dark" ? sunIcon : moonIcon} height={24} />
        </a>
        <a
          className={`button icon ${theme}`}
          href="https://prisma.io"
          title="Prisma website"
          aria-label="Prisma website"
        >
          {/* <Icon icon={prisma} height={24} className="text-white dark:text-gray-200" /> */}
          <Icon icon={prisma} height={24} />
        </a>

        <a
          className={`button icon ${theme}`}
          href="https://github.com/Ovyerus/prismaliser"
          title="Prismaliser GitHub repository"
          aria-label="Prismaliser GitHub repository"
        >
          {/* <Icon icon={github} height={24} className="text-white dark:text-gray-200" /> */}
          <Icon icon={github} height={24} />
        </a>
        <a
          className={`button icon ${theme}`}
          href="https://aus.social/@ovyerus"
          title="Author's Mastodon account"
          aria-label="Author's Mastodon account"
        >
          {/* <Icon icon={mastodon} height={24} className="text-white dark:text-gray-200" /> */}
          <Icon icon={mastodon} height={24} />
        </a>
      </div>
    </nav>
  );
};

export default Nav;
