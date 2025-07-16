import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
  /* config options here */
  // Add Clerk env variables for reference
  // NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY should be set in .env.local
};

export default nextConfig;
