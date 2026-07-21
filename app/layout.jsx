import './globals.css';

export const metadata = {
  title: '丹枫置业 Danfeng Properties · 阿联酋期房智能投顾',
  description:
    'AI 驱动的阿联酋期房智能投顾平台。面向全球华人高净值投资者，从酋长国与区域选择、黄金签证路径，到付款计划与风险提示，生成项目级匹配决策建议。',
  keywords: ['阿联酋期房', '迪拜房产', '黄金签证', '智能投顾', 'Danfeng Properties', '丹枫置业'],
  openGraph: {
    title: '丹枫置业 Danfeng Properties · 阿联酋期房智能投顾',
    description: 'AI 驱动的阿联酋期房智能投顾平台，服务全球华人高净值投资者。',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
