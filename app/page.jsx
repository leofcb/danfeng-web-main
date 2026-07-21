'use client';

// ============================================================
// 主页 IA（首屏对话化改版）：
//   Nav → ① 首屏 = 紧凑品牌横幅 + 子枫对话窗(Console) → ② 精选项目
//        → ③ 开发商 → ④ 热门社区 → 加顾问(Contact) → Footer(合规)
// 传统 Hero（大图/双 CTA/静态预览卡）退役出首页 —— 与对话区重复，
// 现「对话即首屏」。Hero.jsx 组件文件保留不删，供后续内容页复用。
// WhyUAE / About / Vip 同样移出首页（组件保留）。
// ============================================================

import AdvisorProvider from '@/components/AdvisorProvider';
import Nav from '@/components/Nav';
import Console from '@/components/Console';
import FeaturedProjects from '@/components/FeaturedProjects';
import Developers from '@/components/Developers';
import Communities from '@/components/Communities';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <AdvisorProvider>
      <Nav />
      <Console />
      <FeaturedProjects />
      <Developers />
      <Communities />
      <Contact />
      <Footer />
    </AdvisorProvider>
  );
}
