module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@prisma/sdk");
    }

    return config;
  },
};
