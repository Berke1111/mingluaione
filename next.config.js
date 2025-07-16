/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
  },
  images: {
    domains: [
      'images.unsplash.com',
      'files.stripe.com',
      'cdn.clerk.com',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      // add more as needed
    ],
  },
  // Add any rewrites for Clerk or API routes if needed
};

module.exports = nextConfig; 