import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "~": "/src" },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
