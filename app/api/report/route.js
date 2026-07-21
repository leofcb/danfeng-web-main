// 报告接口：前端发送投资画像 → 本路由 → Dify「报告用」应用 → 返回结构化 JSON。
// AI 只产 {intro, matches:[{name, matchScore, reasons}], gvPath}；
// 项目详情与落地页/手册链接由前端按 name 从 lib/catalog（仅 AI 可读字段）回填，
// 保证 AI 全程不接触价格等「仅顾问可见」字段。
import { NextResponse } from 'next/server';
import { difyChat, difyConfigured } from '@/lib/dify';
import { ENABLE_AI_CHAT } from '@/lib/flags';

export const runtime = 'nodejs';

function parseJSON(t) {
  t = String(t || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

export async function POST(req) {
  // 1.0：AI 报告下线（NEXT_PUBLIC_ENABLE_AI_CHAT!=true）→ 直接短路，
  // 绝不触达 Dify；前端已在本地用 lib/match.runMatch 生成正式报告。
  if (!ENABLE_AI_CHAT) {
    return NextResponse.json({ configured: false });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const rawProfile = String(body.profilePrompt || '').slice(0, 4000);
  const user = String(body.user || 'web-anon');
  if (!rawProfile) return NextResponse.json({ error: 'empty_profile' }, { status: 400 });

  // 服务端动态注入"今天日期"，供 Dify 判断交付阶段（零维护，永不过期）
  const today = new Date().toISOString().slice(0, 10);
  const profilePrompt = `【今天日期：${today}】\n${rawProfile}`;

  // Dify 未配置：前端将回落到本地匹配兜底（标注「演示匹配」）。
  if (!difyConfigured('report')) {
    return NextResponse.json({ configured: false });
  }

  try {
    const { answer } = await difyChat(profilePrompt, { kind: 'report', user });
    let data = null;
    try { data = parseJSON(answer); } catch { /* 解析失败 → 交前端兜底 */ }
    if (data && Array.isArray(data.matches) && data.matches.length) {
      return NextResponse.json({ configured: true, data });
    }
    return NextResponse.json({ configured: true, parseError: true });
  } catch (err) {
    console.error('[api/report] dify error:', err?.message);
    return NextResponse.json({ configured: true, error: 'upstream' }, { status: 502 });
  }
}
