
// next.config.mjs - 性能优化配置
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 保持现有配置，只添加性能优化
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // 压缩优化
  compress: true,
  
  // 保持现有的所有其他配置
  ...require('./next.config.mjs').default || {}
};

export default nextConfig;
