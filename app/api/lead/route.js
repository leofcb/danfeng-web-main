// 留资接口：前端表单 → 本路由 → n8n Webhook → monday.com CRM + 企业微信通知。
// 仅服务端持有 Webhook 地址。UAE PDPL：仅采集必要字段，需在前端取得同意、设定保留期限。
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const lead = {
    name: String(body.name || '').slice(0, 80),
    wechat: String(body.wechat || '').slice(0, 80),
    budget: String(body.budget || '').slice(0, 40),
    goal: String(body.goal || '').slice(0, 40),
    message: String(body.message || '').slice(0, 1000),
    source: 'danfeng-web',
    reportContext: String(body.reportContext || '').slice(0, 500),
    consent: body.consent === true,
    consentAt: String(body.consentAt || '').slice(0, 40),
    ts: new Date().toISOString(),
  };

  if (!lead.name || !lead.wechat) {
    return NextResponse.json({ error: 'missing_required' }, { status: 400 });
  }
  // PDPL：无同意不入库
  if (!lead.consent) {
    return NextResponse.json({ error: 'consent_required' }, { status: 400 });
  }

  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (!webhook) {
    // Phase 0：尚未接入 n8n，先服务端记录，前端正常致谢。
    console.log('[api/lead] (no webhook configured) lead received:', lead);
    return NextResponse.json({ ok: true, synced: false });
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`webhook_http_${res.status}`);
    return NextResponse.json({ ok: true, synced: true });
  } catch (err) {
    console.error('[api/lead] webhook error:', err?.message);
    // 即使回写失败也不阻塞客户，留资已在服务端日志留痕。
    return NextResponse.json({ ok: true, synced: false });
  }
}
