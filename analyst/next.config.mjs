/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'tiktoken', 'docx'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'pdf-parse',
        'mammoth',
        'tiktoken',
        'docx',
      ];
    }
    return config;
  },
};
export default nextConfig;
