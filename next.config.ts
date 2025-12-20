import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export
  output: 'export',
  
  // Optional: Configure image optimization (disabled for static export)
  images: {
    unoptimized: true,
  },
  
  // Optional: Add trailing slash for better static hosting compatibility
  trailingSlash: false,
};

export default nextConfig;
