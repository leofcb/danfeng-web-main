'use client';
// ============================================================
// ProjectHeroGallery — 富内容项目页 hero 图区（大图 + 缩略切换）
// 渐进增强：仅当 content/projects/<slug>.json 提供 hero[] 时渲染。
// 无 JS 亦可用（默认展示首图）；缩略图点击/键盘切换主图。
// 图片懒加载 + alt；首图 eager 以优化 LCP。
// ============================================================
import { useState } from 'react';

export default function ProjectHeroGallery({ images = [], projectName = '' }) {
  const [active, setActive] = useState(0);
  if (!images.length) return null;
  const cur = images[active] || images[0];

  return (
    <div className="pdr-gallery">
      <figure className="pdr-gmain">
        <img
          src={cur.src}
          alt={cur.alt || `${projectName} 效果图`}
          loading={active === 0 ? 'eager' : 'lazy'}
          decoding="async"
        />
        {cur.caption && <figcaption className="pdr-gcap">{cur.caption}</figcaption>}
        {cur.credit && <span className="pdr-gcredit">{cur.credit}</span>}
      </figure>

      {images.length > 1 && (
        <div className="pdr-gthumbs" role="tablist" aria-label={`${projectName} 图集`}>
          {images.map((im, i) => (
            <button
              key={im.src}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={im.caption || im.alt || `图 ${i + 1}`}
              className={'pdr-gthumb' + (i === active ? ' on' : '')}
              onClick={() => setActive(i)}
            >
              <img src={im.src} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
