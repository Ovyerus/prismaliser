import react from "@vitejs/plugin-react";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), Icons({ compiler: "jsx", jsx: "react", scale: 1 })],
  resolve: {
    alias: { "~": "/src" },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
