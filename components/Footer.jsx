const RERA = process.env.NEXT_PUBLIC_RERA_LICENSE || '';
const TRAKHEESI = process.env.NEXT_PUBLIC_TRAKHEESI_LICENSE || '';
const ADDRESS = 'Lake Central Tower #1703, Business Bay, Dubai, UAE';
const PHONE = '+971 50 863 0266';
const WHATSAPP = 'https://wa.me/971508630266';
const WHATSAPP_DISPLAY = '+971 50 863 0266';
const licenseText = [RERA && `RERA ${RERA}`, TRAKHEESI && `Trakheesi ${TRAKHEESI}`].filter(Boolean).join(' · ');

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <img src="/logo-horizontal.webp" alt="Danfeng Properties 丹枫置业" style={{ height: '44px', width: 'auto', marginBottom: '14px' }} />
            <p>Danfeng Properties 丹枫置业 · AI 驱动的中东房产智能投顾平台，服务全球华人高净值投资者。</p>
          </div>
          <div className="foot-col">
            <h5>导航</h5>
            <a href="#console">智能投顾</a>
            <a href="#projects">精选项目</a>
            <a href="#developers">开发商榜</a>
            <a href="#communities">热门社区</a>
            <a href="#contact">联系我们</a>
          </div>
          <div className="foot-col foot-contact">
            <h5>联系我们</h5>
            <div className="ci"><span className="k">地址</span><span className="v">{ADDRESS}</span></div>
            <div className="ci"><span className="k">电话</span><a className="v" href={`tel:${PHONE.replace(/\s/g, '')}`}>{PHONE}</a></div>
            <div className="ci"><span className="k">WhatsApp</span><a className="v wa" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.927zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>{WHATSAPP_DISPLAY}</a></div>
            {licenseText && <div className="ci"><span className="k">牌照</span><span className="v">{licenseText}</span></div>}
          </div>
        </div>
        <div className="foot-bottom">
          <div>© 2026 Danfeng Properties 丹枫置业. All rights reserved.</div>
          <div>本站遵循阿联酋 RERA / Trakheesi 与 UAE PDPL 数据保护要求。本平台仅匹配到项目层面，不报具体房源与实时价格；AI 提供参考信息，不构成投资/法律/税务意见。具体户型、价格与房态以丹枫持牌顾问及开发商正式文件为准。</div>
        </div>
      </div>
    </footer>
  );
}
