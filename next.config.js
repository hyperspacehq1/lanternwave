/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,              // Enables App Router
    serverActions: true,       // Required for Next 14 server actions
  },
};

export default nextConfig;
