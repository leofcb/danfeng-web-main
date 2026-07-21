// ============================================================
// build-catalog.mjs — 全量 catalog 构建（571 项，全开发商）
// ------------------------------------------------------------
// 输入：lib/data/raw-board.json（Monday「Projects: Off-Plan」全量只读导出）
// 迁移源：lib/data/emaar-catalog.json（继承已有 cn / tags / blurb 等人工字段）
// 输出：lib/data/catalog.json（schema 与 emaar-catalog.json 逐字段一致）
//
// 价格护栏：只导出开盘起价（priceAED / startHint）。均价、单价(PSF)、
// Units Sold、去化率等市场敏感字段一律不进入本文件。
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'lib', 'data');

const RAW = JSON.parse(readFileSync(join(DATA, 'raw-board.json'), 'utf8'));
const EMAAR = JSON.parse(readFileSync(join(DATA, 'emaar-catalog.json'), 'utf8'));

const NOW_YEAR = 2026; // 与 emaar-catalog 生成时的口径一致：< 2026 标注「近交付/已交付」

// —— City → emirate（小写）——
const CITY_EMIRATE = {
  'Dubai': 'dubai',
  'Abu Dhabi': 'abudhabi',
  'Sharjah': 'sharjah',
  'RAK': 'rak',
  'Ras Al Khaimah': 'rak',
  'Umm Al Quwain': 'uaq',
  'UAQ': 'uaq',
};

// —— Property types EN → CN ——
const TYPE_TOKEN = {
  'Apartment': '公寓',
  'Hotel': '酒店公寓',
  'Townhouse': '联排',
  'Villa': '别墅',
  'Office': '写字楼',
};
function mapTypes(pt) {
  if (!pt) return '';
  return pt.split(',').map((t) => TYPE_TOKEN[t.trim()] || t.trim()).join(' / ');
}

// —— Unit types EN → CN ——
const BED_TOKEN = {
  'Studio': '工作室',
  '1 Bed': '1居',
  '2 Beds': '2居',
  '3 Beds': '3居',
  '4 Beds': '4居',
  '5 Beds': '5居',
  '6 Beds': '6居',
  '7 Beds': '7居',
};
function mapUnitInfo(unitTypes, minSize, maxSize) {
  const beds = String(unitTypes || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((t) => BED_TOKEN[t] || t);
  const min = parseInt(minSize, 10);
  const max = parseInt(maxSize, 10);
  const parts = [];
  if (beds.length) parts.push(beds.join('、'));
  if (Number.isFinite(min) && Number.isFinite(max) && max > 0) {
    parts.push(`约 ${min.toLocaleString('en-US')}–${max.toLocaleString('en-US')} sq.ft.`);
  } else if (Number.isFinite(min) && min > 0) {
    parts.push(`约 ${min.toLocaleString('en-US')} sq.ft. 起`);
  }
  return parts.join('；');
}

// —— handover 文本 + handoverDate ——
function mapHandover(completionDate) {
  const d = String(completionDate || '').trim();
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return { handover: '待定', handoverDate: '' };
  const year = parseInt(m[1], 10);
  const label = year < NOW_YEAR ? `${year}（近交付/已交付）` : String(year);
  return { handover: label, handoverDate: d };
}

// —— 起价 → priceAED ——
function mapPrice(startingPrice) {
  const n = parseInt(String(startingPrice || '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// —— gv（黄金签证适配度）由起价推导 ——
function mapGv(priceAED, unitInfo) {
  if (!priceAED) {
    // 无起价：按户型保守判断。含别墅/大户型给"部分大户型可达"，否则待定。
    if (/别墅|5居|6居|7居/.test(unitInfo || '')) return '部分大户型可达（需选较大户型）';
    return '待定（起价未定 · 请与顾问确认）';
  }
  if (priceAED >= 2000000) return '适配（起价已达 AED 200 万黄金签证门槛）';
  if (priceAED >= 1500000) return '部分大户型可达（需选较大户型）';
  return '多为门槛以下（重身份建议看大户型/别墅）';
}

// —— startHint ——
function mapStartHint(priceAED) {
  if (!priceAED) return '价格请咨询丹枫顾问';
  return `AED ${priceAED.toLocaleString('en-US')} 起（开盘起价 · 非实时报价）`;
}

// —— payment（付款计划结构示意）——
function mapPayment(paymentPlan) {
  const p = String(paymentPlan || '').trim();
  if (!p) return '';
  return `付款计划 ${p}（结构示意，比例以开发商为准）`;
}

// —— tags（片区/景观标签）——
// 优先从景观(views)/位置(location)/配套(amenities)文本关键词推导，叠加起价黄金签证标签。
const WATER_AREAS = ['Dubai Creek Harbour', 'Emaar Beachfront', 'Dubai Marina', 'Rashid Yachts & Marina', 'Address Al Marjan Island', 'Dubai Harbour', 'Dubai Islands', 'Dubai Maritime City', 'Madinat Dubai Almelaheyah'];
const GOLF_AREAS = ['Dubai Hills Estate', 'Emaar South', 'Grand Polo Club and Resort', 'The Heights Country Club and Wellness', 'Jumeirah Golf Estates', 'DAMAC Hills', 'Emirates Hills'];
const CITY_CORE = ['Downtown Dubai', 'Business Bay', 'Zabeel'];
function deriveTags(area, priceAED, blob) {
  const t = new Set();
  const s = String(blob || '');
  if (WATER_AREAS.includes(area) || /beach|sea view|waterfront|marina|lagoon|creek|canal|coast|island|harbour|海|水岸|临海/i.test(s)) {
    t.add('临海'); t.add('水岸');
  }
  if (GOLF_AREAS.includes(area) || /golf|高尔夫/i.test(s)) {
    t.add('高尔夫'); t.add('绿景');
  }
  if (CITY_CORE.includes(area)) t.add('市中心');
  if (priceAED && priceAED >= 2000000) t.add('黄金签证适配');
  return [...t].join('/');
}

// —— blurb（简述）——
function deriveBlurb(developer, community, typesCn, locationDistance) {
  const dev = developer || '开发商';
  const area = community || '';
  const type = typesCn || '项目';
  const firstLoc = String(locationDistance || '')
    .split('\n')
    .map((l) => l.replace(/^[•\-\s]+/, '').trim())
    .filter(Boolean)[0];
  let s = `${dev} 出品，位于${area}的${type}项目`;
  if (firstLoc) s += `；${firstLoc}`;
  return s + '。';
}

// —— 迁移源索引（按 name）——
const emaarByName = new Map(EMAAR.map((p) => [p.name, p]));

// —— 全板重名去重：重名项目用「名（Community）」——
const nameCount = {};
RAW.forEach((r) => { nameCount[r.name] = (nameCount[r.name] || 0) + 1; });
const dedupeList = [];
// 路线二 videoUrl 过滤台账（非 youtube 域名 → 过滤 + 警告）。
const videoFiltered = [];
const videoKept = [];

const catalog = RAW.map((r) => {
  const developer = r.developer || '';
  const emirate = CITY_EMIRATE[r.city] || (r.city ? r.city.toLowerCase() : '');
  const typesCn = mapTypes(r.propertyTypes);
  const unitInfo = mapUnitInfo(r.unitTypes, r.minSize, r.maxSize);
  const { handover, handoverDate } = mapHandover(r.completionDate);
  const priceAED = mapPrice(r.startingPrice);
  const startHint = mapStartHint(priceAED);
  const gv = mapGv(priceAED, unitInfo);
  const payment = mapPayment(r.paymentPlan);
  const location = r.locationDistance || '';
  const amenities = r.amenities || '';
  const views = r.views || '';

  // 重名 → name（Community）
  let name = r.name;
  if (nameCount[r.name] > 1 && r.community) {
    name = `${r.name}（${r.community}）`;
    dedupeList.push(name);
  }

  const inherited = emaarByName.get(r.name);

  // tags：优先继承 emaar-catalog（人工），否则关键词推导
  let tags = inherited && inherited.tags ? inherited.tags : deriveTags(r.community, priceAED, [views, location, amenities].join(' '));

  // blurb：优先继承，否则自动生成
  let blurb = inherited && inherited.blurb ? inherited.blurb : deriveBlurb(developer, r.community, typesCn, location);

  // cn：优先 Monday「Project Name CN」列(text_mm4w4apw → raw.cn)，
  //     否则回退 emaar-catalog 历史迁移的中文名。
  const cn = (r.cn && r.cn.trim()) ? r.cn.trim() : (inherited && inherited.cn ? inherited.cn : '');

  // brochureUrl：🔴 2026-07-10 起禁用（LEO 指令）。Monday「dropbox」列是内部资料库
  // 链接，绝不允许落地前端数据层；楼书下载功能本身也已下架（合规资料未备好）。
  // 字段永久留空占位，保留 schema 结构（前端 SHOW_BROCHURE flag 控制按钮渲染）；
  // 未来资料就绪须接入非 Dropbox 的合规托管源，禁止恢复读取 r.dropbox。
  const brochureUrl = '';
  // landingUrl：Project Link（提取 URL 部分）
  // 🔴 护栏：与 brochureUrl 同一政策——Dropbox 内部资料链接绝不进入前端数据层。
  // Project Link 列本应是开发商官网，个别条目误粘了 Dropbox 分享链接（如 Tara Park），
  // 一律在此过滤，不导出，不回退继承（继承源也做同样过滤）。
  let landingUrl = '';
  const link = String(r.projectLink || '').trim();
  if (link) {
    const um = link.match(/https?:\/\/\S+/);
    landingUrl = um ? um[0] : '';
  }
  if (landingUrl && /dropbox\.com/i.test(landingUrl)) landingUrl = '';
  if (!landingUrl && inherited && inherited.landingUrl && !/dropbox\.com/i.test(inherited.landingUrl)) landingUrl = inherited.landingUrl;

  // videoUrl：Monday「Video URL」列（text，导出键 r.videoUrl）→ catalog videoUrl。
  // 🔴 路线二护栏：只放行 youtube.com / youtu.be / youtube-nocookie.com；其它域名
  //    （尤其 dropbox 内部资料链接）一律过滤 + 警告，绝不进前端数据层。空缺则不写此键。
  let videoUrl = '';
  const rawVideo = String(r.videoUrl || '').trim();
  if (rawVideo) {
    const vm = rawVideo.match(/https?:\/\/\S+/);
    const u = vm ? vm[0] : '';
    if (u && /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(u)) {
      videoUrl = u;
      videoKept.push({ name: r.name, url: u });
    } else if (u) {
      videoFiltered.push({ name: r.name, url: u });
    }
  }

  return {
    name,
    cn,
    emirate,
    developer,
    area: r.community || '',
    types: typesCn,
    unitInfo,
    handover,
    handoverDate,
    status: r.presaleStatus || '',
    startHint,
    priceAED,
    gv,
    tags,
    blurb,
    payment,
    location,
    amenities,
    landingUrl,
    brochureUrl,
    // 仅当有合规 youtube 视频链接时写此键（空缺不写 → 无视频项目 catalog 逐字节不变，零回归）。
    ...(videoUrl ? { videoUrl } : {}),
  };
});

writeFileSync(join(DATA, 'catalog.json'), JSON.stringify(catalog, null, 1));

// —— 统计 ——
const byDev = {};
catalog.forEach((p) => { byDev[p.developer || '(未标注)'] = (byDev[p.developer || '(未标注)'] || 0) + 1; });
let cnMig = 0, tagsMig = 0, blurbMig = 0;
RAW.forEach((r) => {
  const inh = emaarByName.get(r.name);
  if (inh && inh.cn) cnMig++;
  if (inh && inh.tags) tagsMig++;
  if (inh && inh.blurb) blurbMig++;
});
const noPrice = catalog.filter((p) => !p.priceAED).length;
const noHandover = catalog.filter((p) => !p.handoverDate).length;
const noBlurb = catalog.filter((p) => !p.blurb).length;
const noLanding = catalog.filter((p) => !p.landingUrl).length;

console.log('总数:', catalog.length);
console.log('开发商分布:', JSON.stringify(byDev, null, 1));
console.log('重名去重:', dedupeList.length, JSON.stringify(dedupeList));
console.log(`迁移 cn:${cnMig} tags:${tagsMig} blurb:${blurbMig}`);
console.log(`空缺 起价:${noPrice} handover:${noHandover} blurb:${noBlurb} landingUrl:${noLanding}`);
// 路线二 videoUrl 台账
console.log(`视频 videoUrl 放行(youtube):${videoKept.length}${videoKept.length ? ' → ' + JSON.stringify(videoKept.map((v) => v.name)) : ''}`);
if (videoFiltered.length) {
  console.warn(`⚠ videoUrl 过滤(非 youtube 域名，绝不入前端数据层):${videoFiltered.length}`);
  for (const v of videoFiltered) console.warn(`   ✗ ${v.name}: ${v.url}`);
}
