/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a minimal Node.js server with all dependencies
  output: 'standalone',
  
  // Disable image optimization for standalone builds
  // Next.js Image Optimization API is not available in standalone mode
  images: {
    unoptimized: true,
  },
  
  // Environment variables available to the browser
  env: {
    NEXT_PUBLIC_CLOUDFRONT_URL: process.env.NEXT_PUBLIC_CLOUDFRONT_URL,
  },
};

export default nextConfig;
