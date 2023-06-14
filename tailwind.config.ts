import defaultTheme from "tailwindcss/defaultTheme";

import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", ...defaultTheme.fontFamily.sans],
      },
    },
    fill: {
      none: "none",
    },
  },
  plugins: [],
} satisfies Config;
