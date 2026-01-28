/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // Allow argon2 native bindings to be bundled for server environments
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'abviphzzwoexcpwgppfi.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        // Allow any Supabase project storage bucket (covering preview/prod projects)
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  reactStrictMode: true,
}

export default nextConfig