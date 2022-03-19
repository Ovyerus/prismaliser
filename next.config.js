module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // `outputStandalone` is currently broken on Windows it seems, so ignore it for now
  experimental:
    process.platform === "win32"
      ? {}
      : {
          outputStandalone: true,
        },
};
