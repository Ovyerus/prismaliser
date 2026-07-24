import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vitest/config";

import { PRISMALISER_OAUTH_SCOPE } from "./src/atproto/constants";

const DEV_HOST = "127.0.0.1";
const DEV_PORT = 5173;
const DEV_REDIRECT = `http://${DEV_HOST}:${DEV_PORT}/`;
const DEV_CLIENT_ID =
  `http://localhost?redirect_uri=${encodeURIComponent(DEV_REDIRECT)}` +
  `&scope=${encodeURIComponent(PRISMALISER_OAUTH_SCOPE)}`;

export default defineConfig(({ command }) => ({
  define:
    command === "serve"
      ? {
          "import.meta.env.VITE_OAUTH_CLIENT_ID": JSON.stringify(DEV_CLIENT_ID),
          "import.meta.env.VITE_OAUTH_REDIRECT_URI":
            JSON.stringify(DEV_REDIRECT),
        }
      : undefined,
  plugins: [
    react(),
    tailwindcss(),
    Icons({ compiler: "jsx", jsx: "react", scale: 1 }),
  ],
  resolve: {
    alias: { "~": "/src" },
  },
  server: {
    host: DEV_HOST,
    port: DEV_PORT,
    strictPort: true,
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
