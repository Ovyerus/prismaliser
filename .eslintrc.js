module.exports = {
  extends: ["clarity/react-typescript"],
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {
    "@typescript-eslint/no-misused-promises": "off",
    // unplugin-icons virtual modules only exist at build time.
    "import/no-unresolved": ["error", { ignore: ["^~icons/"] }],
  },
};
