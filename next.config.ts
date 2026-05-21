import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Permite chamar a API local em desenvolvimento
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ]
  },
}

export default nextConfig