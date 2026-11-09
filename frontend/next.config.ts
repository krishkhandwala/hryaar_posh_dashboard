const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8001/api/v1/:path*',
      },
      {
        source: '/static/:path*',
        destination: 'http://127.0.0.1:8001/static/:path*',
      },
    ];
  },
};

export default nextConfig;
