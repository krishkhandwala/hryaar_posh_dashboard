const backendOrigin = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8001';

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/static/:path*',
        destination: `${backendOrigin}/static/:path*`,
      },
    ];
  },
};

export default nextConfig;
