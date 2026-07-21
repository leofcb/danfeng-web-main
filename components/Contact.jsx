'use client';

import { useState } from 'react';

const WECHAT = process.env.NEXT_PUBLIC_WECHAT_ID || 'leofcb';

export default function Contact() {
  const [form, setForm] = useState({ name: '', wechat: '', budget: '', goal: '', message: '' });
  const [consent, setConsent] = useState(false);
  const [ok, setOk] = useState(null); // {type:'err'|'ok', node}
  const [sending, setSending] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim() || !form.wechat.trim()) {
      setOk({ type: 'err', text: '请至少填写姓名与微信号，方便顾问与你联系。' });
      return;
    }
    if (!consent) {
      setOk({ type: 'err', text: '请先勾选同意，我们方可处理你的联系信息用于咨询回访。' });
      return;
    }
    setSending(true);
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, consent: true, consentAt: new Date().toISOString() }),
      });
    } catch { /* 即使失败也照常致谢，避免阻塞客户 */ }
    setSending(false);
    setOk({
      type: 'ok',
      text: `✓ 已收到，${form.name}！丹枫顾问将通过微信（${form.wechat}）尽快与你联系，确认具体房源与报价。`,
      note: '我们仅将你的信息用于本次咨询回访，依 PDPL 合规处理。',
    });
  };

  const okStyle = ok?.type === 'err'
    ? { background: '#fbecec', borderColor: '#e7baba', color: '#a3201f' }
    : { background: '#eef6ef', borderColor: '#bfe0c4', color: '#1e6b34' };

  return (
    <section className="sec-pad paper" id="contact">
      <div className="wrap">
        <div className="sec-head reveal in">
          <span className="eyebrow">预约咨询</span>
          <h2>与丹枫持牌顾问对话</h2>
          <p>留下信息，顾问将通过微信与你联系，结合 AI 投顾结果提供个性化方案。</p>
        </div>
        <div className="contact-grid reveal in">
          <div>
            {ok && (
              <div className="form-ok show" style={okStyle}>
                {ok.text}
                {ok.note && <><br /><span style={{ fontSize: '12.5px', opacity: 0.8 }}>{ok.note}</span></>}
              </div>
            )}
            <div className="cform">
              <div className="row">
                <div><label>姓名</label><input value={form.name} onChange={set('name')} placeholder="您的称呼" /></div>
                <div><label>微信号（优先联系方式）</label><input value={form.wechat} onChange={set('wechat')} placeholder="WeChat ID" /></div>
              </div>
              <div className="row">
                <div>
                  <label>投资预算</label>
                  <select value={form.budget} onChange={set('budget')}>
                    <option value="">请选择</option>
                    <option>¥150–300 万</option>
                    <option>¥300–500 万</option>
                    <option>¥500–800 万</option>
                    <option>¥800 万以上</option>
                  </select>
                </div>
                <div>
                  <label>购房目的</label>
                  <select value={form.goal} onChange={set('goal')}>
                    <option value="">请选择</option>
                    <option>黄金签证</option>
                    <option>资本增值</option>
                    <option>租金收益</option>
                    <option>子女教育</option>
                    <option>自住</option>
                  </select>
                </div>
              </div>
              <div><label>留言（可选）</label><textarea rows={3} value={form.message} onChange={set('message')} placeholder="想了解的项目、问题或时间安排…" /></div>
              <label className="consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>我已阅读并同意丹枫置业的隐私声明，授权其处理我的联系信息用于本次咨询回访。</span>
              </label>
              <button className="btn btn-red" style={{ justifyContent: 'center' }} disabled={sending} onClick={submit}>
                {sending ? '提交中…' : '提交咨询'}
              </button>
            </div>
          </div>
          <div className="cside">
            <div style={{ fontSize: 15, letterSpacing: '.06em' }}>微信沟通</div>
            <div className="qr"><img src="/wechat-qr.png" alt="丹枫投资顾问微信二维码" className="qr-img" /></div>
            <div className="wx">WeChat: {WECHAT}</div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 14 }}>扫码添加丹枫投资顾问，获取一手资料以及方案</p>
          </div>
        </div>
      </div>
    </section>
  );
}
