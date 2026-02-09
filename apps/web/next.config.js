const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // monorepo root (two levels up from apps/web)
    root: path.resolve(__dirname, "..", ".."),
  },
};

module.exports = nextConfig;