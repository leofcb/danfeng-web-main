'use client';
// ============================================================
// ProjectVideoEmbed — 路线二「项目视频」懒加载 YouTube 门面（性能 + 隐私）
// ------------------------------------------------------------
// 默认只渲染 YouTube 封面图（img.youtube.com/vi/<id>/…）+ 播放按钮，零 iframe、
// 零第三方脚本；用户点击后才注入 youtube-nocookie 隐私增强 iframe（不设 cookie 直到播放）。
// 纯 DOM 交互、无 catalog 依赖，故拆为独立 client 组件（不把装配数据打进客户端包）。
// 数据全部来自装配器 buildProjectPageData 的 data.video（youtubeId/embedUrl/watchUrl）。
// ============================================================
import { useState } from 'react';

export default function ProjectVideoEmbed({ video }) {
  const [play, setPlay] = useState(false);
  if (!video || !video.youtubeId) return null;
  const id = video.youtubeId;
  // maxres 封面偶有缺失 → onError 回落 hqdefault（YouTube 恒有）。
  const thumb = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const thumbFallback = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <div className="video-embed">
      {play ? (
        <iframe
          className="video-iframe"
          src={video.embedUrl}
          title="项目视频"
          loading="lazy"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="video-facade"
          onClick={() => setPlay(true)}
          aria-label="播放项目视频"
          style={{ '--video-thumb': `url("${thumb}")` }}
        >
          {/* 隐藏 img 仅用于探测封面可用性；缺失时把外层背景切到 hqdefault 兜底 */}
          <img
            src={thumb}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="video-thumb-probe"
            onError={(e) => {
              e.currentTarget.parentElement.style.setProperty('--video-thumb', `url("${thumbFallback}")`);
            }}
          />
          <span className="video-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </button>
      )}
    </div>
  );
}
