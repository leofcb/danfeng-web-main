// 客户端文本格式化工具（与原型一致的轻量 Markdown → HTML）。
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function mdToHtml(t) {
  t = esc(t);
  const lines = t.split('\n');
  let html = '';
  let inList = false;
  for (const ln of lines) {
    if (/^###\s+/.test(ln)) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<h4>' + ln.replace(/^###\s+/, '') + '</h4>';
      continue;
    }
    if (/^\s*[-•]\s+/.test(ln)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += '<li>' + ln.replace(/^\s*[-•]\s+/, '') + '</li>';
      continue;
    }
    if (inList) { html += '</ul>'; inList = false; }
    if (ln.trim() === '') continue;
    html += '<div>' + ln + '</div>';
  }
  if (inList) html += '</ul>';
  return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
