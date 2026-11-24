/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["node:sqlite"],
  webpack(config, { isServer }) {
    if (!isServer) {
      // ponytail: disable client module concatenation until Next.js flight-manifest-plugin fixes falsy module ID 0 check; remove after Next.js upgrade
      config.optimization.concatenateModules = false;
    }
    return config;
  },
};

export default nextConfig;
