/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,              // REQUIRED for app/api/** routes
    serverActions: true,       // optional but recommended
  }
};

module.exports = nextConfig;
