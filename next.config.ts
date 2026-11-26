import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/salvar.php',
        destination: '/api/salvar',
      },
      {
        source: '/atualizar.php',
        destination: '/api/atualizar',
      },
      {
        source: '/exportar.php',
        destination: '/api/exportar',
      },
    ];
  },
};

export default nextConfig;
