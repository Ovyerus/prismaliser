/** @type import('next').NextConfig */
module.exports = {
  // `outputStandalone` is currently broken on Windows it seems, so ignore it for now
  output: process.platform !== "win32" ? "standalone" : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
};
