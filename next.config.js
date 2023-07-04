const plausibleScript = "/js/script.js";
const plausibleEndpoint = "/api/event";

/** @type import('next').NextConfig */
module.exports = {
  // `outputStandalone` is currently broken on Windows it seems, so ignore it for now
  output: process.platform !== "win32" ? "standalone" : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    if (!process.env.PLAUSIBLE_HOST) return [];

    return [
      {
        source: plausibleScript,
        destination: new URL(plausibleScript, process.env.PLAUSIBLE_HOST).href,
        basePath: false,
      },
      {
        source: plausibleEndpoint,
        destination: new URL(plausibleEndpoint, process.env.PLAUSIBLE_HOST)
          .href,
        basePath: false,
      },
    ];
  },
};
