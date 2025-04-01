const umamiScript = "/script.js";

/** @type import('next').NextConfig */
module.exports = {
  // `outputStandalone` is currently broken on Windows it seems, so ignore it for now
  output: process.platform !== "win32" ? "standalone" : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    if (!process.env.UMAMI_HOST) return [];

    return [
      {
        source: umamiScript,
        destination: new URL(umamiScript, process.env.UMAMI_HOST).href,
        basePath: false,
      },
    ];
  },
};
