module.exports = {
  extends: ["clarity/react-typescript"],
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {
    "@typescript-eslint/no-misused-promises": "off",
  },
};
