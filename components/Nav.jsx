'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// 四板块 IA（§3.1）：智能投顾 · 精选项目 · 开发商 · 热门社区。
// 「精选项目」= 独立路由 /projects（设计规格 §9，语义更清晰）；
// 其余为首页栏目锚点。非首页时锚点跳回首页对应片段。
const LINKS = [
  ['home#console', '智能投顾'],
  ['/projects', '精选项目'],
  ['/developers', '开发商榜'],
  ['/communities', '热门社区'],
];
const SECTION_IDS = ['console', 'projects', 'developers', 'communities'];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      if (!onHome) return;
      let cur = '';
      SECTION_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 160) cur = id;
      });
      setActive(cur);
    };
    addEventListener('scroll', onScroll);
    onScroll();
    return () => removeEventListener('scroll', onScroll);
  }, [onHome]);

  // href 形态：'home#id' = 首页锚点；'/xxx' = 路由。
  const go = (href) => {
    setMenuOpen(false);
    if (href.startsWith('home#')) {
      const id = href.slice(5);
      if (onHome) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        router.push(`/#${id}`);
      }
    } else {
      router.push(href);
    }
  };

  const isActive = (href) => {
    if (href === '/projects') return pathname.startsWith('/projects');
    if (href === '/developers') return pathname.startsWith('/developers');
    if (href === '/communities') return pathname.startsWith('/communities');
    if (href.startsWith('home#')) return onHome && active === href.slice(5);
    return false;
  };

  return (
    <nav id="nav" className={scrolled ? 'scrolled' : ''}>
      <div className="wrap nav-in">
        <a href="/" className="brand" onClick={(e) => { e.preventDefault(); onHome ? document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' }) : router.push('/'); }}>
          <img src="/logo-mark.png" alt="丹枫置业" />
          <div className="bt">
            <div className="en">Danfeng Properties</div>
            <div className="cn">丹 枫 置 业</div>
          </div>
        </a>
        <div
          className="nav-links"
          id="navlinks"
          style={menuOpen ? {
            display: 'flex', flexDirection: 'column', position: 'absolute', top: '74px',
            right: '18px', background: 'var(--panel)', padding: '16px 22px',
            borderRadius: '8px', border: '1px solid var(--line)',
          } : undefined}
        >
          {LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href.startsWith('home#') ? `/#${href.slice(5)}` : href}
              className={isActive(href) ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); go(href); }}
            >
              {label}
            </a>
          ))}
        </div>
        <div className="nav-cta">
          <button className="menu-btn" onClick={() => setMenuOpen((o) => !o)}>☰</button>
        </div>
      </div>
    </nav>
  );
}
