import { STANDALONE_PROJECT_SLUGS, STANDALONE_DEVELOPER_SLUGS, STANDALONE_COMMUNITY_SLUGS } from './lib/standalonePages.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 所有第三方密钥（Dify / monday / n8n）只在服务端 API 路由读取，永不进入浏览器包。
  // WEB-LP-V1.3 独立 HTML 落地页：/projects/<slug> 正式指向 public 静态页（覆盖 catalog 自动页）。
  // beforeFiles 在动态路由之前命中，故 /projects/hado 直接服务静态 index.html。
  // WEB-DEV-V1 开发商档案页同理：/developers/<slug> 指向 public/developers/<slug>/index.html。
  async rewrites() {
    return {
      beforeFiles: [
        ...STANDALONE_PROJECT_SLUGS.map((slug) => ({
          source: `/projects/${slug}`,
          destination: `/projects/${slug}/index.html`,
        })),
        ...(STANDALONE_DEVELOPER_SLUGS || []).map((slug) => ({
          source: `/developers/${slug}`,
          destination: `/developers/${slug}/index.html`,
        })),
        ...(STANDALONE_COMMUNITY_SLUGS || []).map((slug) => ({
          source: `/communities/${slug}`,
          destination: `/communities/${slug}/index.html`,
        })),
      ],
    };
  },
};

export default nextConfig;
