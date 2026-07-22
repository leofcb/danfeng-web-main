// ============================================================
// build-beyond-pages.mjs — 一次性批量生成 7 个 BEYOND 项目落地页
// 在 Mac danfeng-web 目录跑：node scripts/build-beyond-pages.mjs
// 逻辑：内嵌 7 项目 Monday 数据 → 生成 scripts/landing/<slug>.json
//       + 装配 deliverables/<slug>/assets(hero 9张 + 二维码) → 调 gen-landing.mjs 出页。
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, cpSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');   // danfeng-web/
const LAND = join(WEB, 'scripts', 'landing');
const PUBIMG = join(WEB, 'public', 'img', 'projects');
const DELIV = join(WEB, 'deliverables');
const QRSRC = join(WEB, 'public', 'projects', 'arancia-yards-2', 'assets');  // 复用二维码

// 每项目：pageSlug（URL）、assetDir（hero 图所在 /img/projects/<dir>）、及内容字段。
const P = [
  { slug: 'passo-by-beyond', assetDir: 'passo', item: 9786291705, name: 'PASSO', cn: '帕索公寓',
    comm: 'Palm Jumeirah', commSlug: 'palm-jumeirah', video: 'yueG74a4V8I',
    kicker: 'Palm Jumeirah · BEYOND', tagline: '棕榈岛上的疗愈奢居', enTag: 'Waterfront Wellness Living',
    buildings: '2 栋', floors: '15 层', units: '约 625 套', types: '1–6 居', payment: '10 / 50 / 40',
    minS: 968, maxS: 10167, start: 5500000, handover: '2029 年 Q4', constr: '未开工',
    blurb: '棕榈岛全新豪宅公寓项目，由超越地产（BEYOND）打造，共约 625 套，1 房至 6 房户型，滨海而居、疗愈生活尽享顶级奢华。',
    galCaps: ['夜景全貌','日景外观','日景近景','鸟瞰全景','黄昏立面','顶层复式','泳池水景','泳池与私享海滩','私享海滩','社交会所','立面细节'] },
  { slug: 'kanyon', assetDir: 'kanyon', item: 18387155771, name: 'KANYON', cn: '卡尼恩',
    comm: 'Dubai Maritime City', commSlug: 'dubai-maritime-city', video: 'tS28IT1lkKM',
    kicker: 'Dubai Maritime City · BEYOND', tagline: '海事城的挺拔天际线', enTag: 'A New Maritime Landmark',
    buildings: '1 栋', floors: 'G+3P+45 层', units: '约 412 套', types: '1–3 居', payment: '10 / 40 / 50',
    minS: 798, maxS: 2402, start: 2400000, handover: '2028 年 Q3', constr: '未开工',
    blurb: 'KANYON（卡尼恩）是 BEYOND 于迪拜海事城打造的公寓项目，共约 412 套，1 房至 3 房，采用 10%/40%/50% 付款计划，坐拥港口与市中心双向通达。',
    galCaps: ['塔楼外观','日景立面','水岸视角','建筑冠顶','夜景外观','入户礼序','近景细节','景观视角','滨海全景'] },
  { slug: 'soulever', assetDir: 'soulever', item: 18145456982, name: 'Soulever', cn: '苏莱弗公寓',
    comm: 'Dubai Maritime City', commSlug: 'dubai-maritime-city', video: 'cWshibSwvto',
    kicker: 'Dubai Maritime City · BEYOND', tagline: '双塔临海的静奢生活', enTag: 'Elevated Waterfront Serenity',
    buildings: '2 栋', floors: '2B+G+3P+44 层', units: '约 517 套', types: '1–5 居', payment: '20 / 50 / 30',
    minS: 839, maxS: 3115, start: 2530000, handover: '2028 年 Q4', constr: '未开工',
    blurb: '迪拜海事城双塔公寓项目，由 BEYOND 打造，2 栋 2B+G+3P+44 层，1 房至 5 房户型，以疗愈 SPA、泳池平台与海岸步道诠释静奢生活。',
    galCaps: ['建筑冠顶','夜景立面','悦墅露台','日景立面','夜景水景','泳池平台','裙楼视角','海岸步道','SPA 水疗','理疗室','图书馆'] },
  { slug: '31-above', assetDir: '31-above', item: 18378633686, name: '31 ABOVE', cn: '31 号办公楼',
    comm: 'Dubai Maritime City', commSlug: 'dubai-maritime-city', video: 'dw9-naxBvQ0',
    kicker: 'Dubai Maritime City · BEYOND', tagline: '岛上办公新纪元', enTag: 'The Island Business Address',
    buildings: '1 栋', floors: 'G+5P+31 层', units: '约 118 套', types: '甲级写字楼', payment: '10 / 40 / 50',
    minS: 2200, maxS: 4500, start: 7700000, handover: '2028 年 Q4', constr: '在建',
    blurb: '迪拜海事城首座商业塔楼，由 BEYOND 旗下 Beyond Vespera 开发，G+5 停车层 +31 层甲级办公，2200–4500 平方英尺，临港近市中心，开启岛上办公新纪元。',
    galCaps: ['塔楼全貌','日景立面','无人渲染','日景近景','黄昏立面','入口落客','露台视角','露台近景','商务空间','公共大堂','办公层景','景观视角','裙楼细节','夜景全景'], office: true },
  { slug: 'saria', assetDir: 'saria', item: 8113423887, name: 'SARIA', cn: '萨丽亚',
    comm: 'Dubai Maritime City', commSlug: 'dubai-maritime-city', video: 'ThdaPQP1iFU',
    kicker: 'Dubai Maritime City · BEYOND', tagline: '滨水而立的建筑冠冕', enTag: 'A Waterfront Crown',
    buildings: '1 栋', floors: '43 层', units: '约 372 套', types: '1–4 居 / 复式 / 顶层', payment: '10 / 40 / 50',
    minS: 758, maxS: 4612, start: 1700000, handover: '2027 年 Q4', constr: '在建',
    blurb: '萨丽亚（SARIA）是 BEYOND 于迪拜海事城打造的滨水住宅项目，约 372 套，含公寓、复式与顶层产品，以建筑冠顶、游艇码头与景观泳池诠释临海生活。',
    galCaps: ['滨水塔楼','游艇码头','建筑冠顶','景观泳池','住宅大堂','起居空间','健身中心','私享影院','主卧套房'] },
  { slug: 'the-mural', assetDir: 'the-mural', item: 8871921099, name: 'The MURAL', cn: '壁画',
    comm: 'Dubai Maritime City', commSlug: 'dubai-maritime-city', video: '2bAaw6iHWt4',
    kicker: 'Dubai Maritime City · BEYOND', tagline: '海岸线上的艺术宣言', enTag: 'An Artful Waterfront Statement',
    buildings: '1 栋', floors: '31 层', units: '约 268 套', types: '1–3 居', payment: '10 / 40 / 50',
    minS: 750, maxS: 5780, start: 2470000, handover: '2028 年 Q3', constr: '在建',
    blurb: 'The MURAL（壁画）是 BEYOND 于迪拜海事城打造的滨海公寓项目，约 268 套，1 房至 3 房，以艺术化设计语言重塑海岸线上的当代雅致生活。',
    galCaps: ['项目影像','项目影像','塔楼渲染','海岸视角','建筑立面','景观视角','生活空间','滨海全景','项目影像'] },
  { slug: 'orise', assetDir: 'orise', item: 12462704764, name: 'Orise', cn: '奥瑞斯',
    comm: 'Dubai Maritime City', commSlug: 'dubai-maritime-city', video: '-AGHtw_x508',
    kicker: 'Dubai Maritime City · BEYOND', tagline: '朝阳海岸的升起之作', enTag: 'Rise by the Sea',
    buildings: '—', floors: '—', units: '公寓 / 顶层复式', types: '公寓 / 顶层', payment: '10 / 35 / 50',
    minS: 0, maxS: 0, start: 1920000, handover: '2028 年 Q1', constr: '在建',
    blurb: 'Orise（奥瑞斯）为 BEYOND（Omniyat 旗下品牌）位于迪拜海事城的滨海公寓项目，含公寓与顶层复式，配套涵盖海滩通道、酒店与 SPA 设施、健身房、办公/学习空间及景观花园。',
    galCaps: ['海景日落','项目全貌','海景渲染','海岸视角','天际线景','生活空间','滨海视角','建筑立面','塔楼景观'] },
];

const money = (n) => n >= 10000 ? `AED ${(n / 10000).toLocaleString('en-US', { maximumFractionDigits: 0 })} 万起` : '垂询顾问';
const heroName = (i) => `hero-${i}`;   // deliverables/<slug>/assets/hero-i.webp

function toLanding(d) {
  const G = (d.galCaps || []).slice(0, 9);
  while (G.length < 9) G.push('项目影像');
  const gallery = G.map((t, i) => ({ src: heroName(i + 1), title: t, ...(i === 0 ? { span: t } : {}) }));
  const isOffice = !!d.office;
  const sizeLine = d.minS ? `${d.minS.toLocaleString()}–${d.maxS.toLocaleString()} 平方英尺` : '以官方分户表为准';

  const facts = [
    { k: '项目', v: `${d.name} ${d.cn}` },
    { k: '位置', v: `${d.comm}` },
    { k: '开发商', v: 'BEYOND 超越地产' },
    { k: '建筑', v: `${d.buildings} · ${d.floors}` },
    { k: isOffice ? '办公' : '住宅', v: `${d.units}` },
    { k: '类型', v: d.types },
    { k: '计划交付', v: d.handover, em: '以 SPA 为准' },
  ];

  const overviewParas = [
    d.blurb,
    `项目坐落于${d.comm}，由 BEYOND（OMNIYAT GROUP 旗下高端地产品牌）开发，强调设计、自然与品质生活。建筑规模 ${d.buildings}、${d.floors}，${isOffice ? '甲级办公' : d.types + '户型'}，面积约 ${sizeLine}。`,
    `付款计划为 ${d.payment}，${d.constr === '在建' ? '目前在建' : '当前尚未开工'}，计划于 ${d.handover} 交付。开工与交付时间、面积、套数与价格均以开发商正式文件及 SPA 为准。`,
  ];
  const metrics = [
    { n: (d.units.match(/[\d,]+/) || ['—'])[0], u: isOffice ? '套办公' : '套住宅', p: `官方${isOffice ? '办公' : '住宅'}总量（约）。` },
    { n: d.buildings.replace(/[^\d]/g, '') || '1', u: '栋建筑', p: `建筑规模：${d.floors}。` },
    { n: d.types, u: '', p: isOffice ? '甲级写字楼产品。' : '公寓/复式产品组合。' },
    { n: d.payment.split(' / ')[0] + '%', u: '预订首付', p: `付款计划 ${d.payment}。` },
  ];

  const highlights = {
    photo: heroName(4),
    items: [
      { b: d.comm, h: `${d.comm} 门户地段`, p: `坐落${d.comm}，${d.comm === 'Palm Jumeirah' ? '棕榈岛滨海稀缺地段，' : '迪拜海事城临港片区，'}通达全城主干道，兼具景观与通勤价值。` },
      { b: 'BEYOND 出品', h: 'OMNIYAT 旗下高端品牌', p: 'BEYOND 为 OMNIYAT GROUP 旗下高端地产品牌，强调设计、自然与品质生活；集团背景有助品牌与资源组织，最终交付仍以官方文件为准。' },
      { b: isOffice ? '甲级办公' : '临海人居', h: isOffice ? '岛上稀缺办公载体' : '景观与生活方式并重', p: isOffice ? '岛上稀缺的甲级办公塔楼，面向企业总部与高端商务需求。' : '以滨海景观、休闲配套与生活方式塑造日常，让景观成为社区底色。' },
      { b: '产品格局', h: `${d.types} · ${sizeLine}`, p: `提供 ${d.types} 产品，面积约 ${sizeLine}，可满足不同投资与自住需求。具体分户以官方价单为准。` },
      { b: '付款友好', h: `${d.payment} 分期`, p: `付款计划 ${d.payment}，计划 ${d.handover} 交付，兼顾资金节奏与工程周期。` },
    ],
  };

  const product = [
    { tag: 'ARCHITECTURE · 建筑设计', img: heroName(1), h: '临海而立的当代建筑', p: `${d.name} 以当代建筑语言回应${d.comm}的滨海环境，立面挺拔、尺度考究，与港湾景观相互借景。` },
    { tag: 'VIEWS · 景观视野', img: heroName(2), h: '港湾与天际线的双重视野', p: '朝向经过精心组织，将海景、港口与城市天际线纳入日常视野，光线与水景成为空间的一部分。' },
    { tag: isOffice ? 'WORKSPACE · 办公空间' : 'INTERIOR · 室内空间', img: heroName(6), h: isOffice ? '高效灵动的办公格局' : '通透开阔的起居格局', p: isOffice ? '高效灵动的办公层格局，充沛自然光与优质配套，面向高端商务与总部需求。' : '通透开阔的起居格局，落地窗引入自然光与海景，室内外无缝衔接。' },
    { tag: 'AMENITIES · 配套设施', img: heroName(7), h: '全维生活方式配套', p: `${isOffice ? '商务大堂、会议与休憩空间等办公配套一应俱全。' : '泳池、健身、SPA、景观花园与休闲餐饮等配套融入社区，构成完整的生活方式。'}` },
  ];

  const amenities = {
    title: '一处配套，', em: '串联每天的生活',
    mosaic: [ { img: heroName(4), cap: G[3] || '景观' }, { img: heroName(6), cap: G[5] || '生活空间' }, { img: heroName(7), cap: G[6] || '配套' } ],
    list: isOffice
      ? [ { icon: '🏢', t: '甲级办公层' }, { icon: '🅿️', t: '多层停车' }, { icon: '🛎️', t: '商务大堂' }, { icon: '🤝', t: '会议空间' }, { icon: '☕', t: '休憩咖啡' }, { icon: '📹', t: 'CCTV 安防' } ]
      : [ { icon: '🏊', t: '泳池' }, { icon: '💪', t: '健身中心' }, { icon: '🧖', t: 'SPA 水疗' }, { icon: '🌳', t: '景观花园' }, { icon: '🍽️', t: '餐饮咖啡' }, { icon: '🏖️', t: '海滩通道' }, { icon: '🧸', t: '儿童乐园' }, { icon: '📹', t: 'CCTV 安防' } ],
    secondary: [ { img: heroName(8), cap: G[7] || '滨海' }, { img: heroName(5), cap: G[4] || '空间' }, { img: heroName(3), cap: G[2] || '景观' } ],
  };

  const community = {
    area: d.comm, slug: d.commSlug, em: 'Area Community · 所属社区',
    h: d.comm === 'Palm Jumeirah' ? '迪拜地标级滨海人居' : '迪拜海事城 · 临港新中心',
    p: d.comm === 'Palm Jumeirah'
      ? 'Palm Jumeirah（棕榈岛）是迪拜地标级人工岛，滨海稀缺、配套成熟，沿主干道通达全城，是高端滨海人居的代名词。'
      : 'Dubai Maritime City（迪拜海事城）是迪拜规划中的临港综合片区，紧邻港口与市中心，沿主干道快速通达，兼具产业、滨海景观与生活方式。',
    tags: d.comm === 'Palm Jumeirah' ? ['棕榈岛','滨海地标','稀缺地段','成熟配套','高端人居'] : ['迪拜海事城','临港片区','近市中心','滨海景观','成长型片区'],
    facts: [ { b: 'BEYOND', s: '出品开发商' }, { b: d.units.match(/[\d,]+/)?.[0] || '—', s: isOffice ? '办公规模' : '住宅规模' }, { b: d.handover.replace(/\s*年\s*/, ' '), s: '计划交付' }, { b: d.payment.split(' / ')[0] + '%', s: '预订首付' } ],
  };

  const units = {
    intro: [
      `${d.name} 提供 ${d.types} 产品，面积约 ${sizeLine}${d.minS ? `，起售价 ${money(d.start)}` : ''}。`,
      '面积与价格为官方示意，不代表每一套房源。具体楼层、朝向、面积、套数、价格及可售状态，应按开发商当期分户表和价单逐套确认。',
    ],
    photo: heroName(5),
    cards: isOffice
      ? [ { b: '甲级', span: '办公', h: 'Grade-A Office', rows: [ { k: '面积', v: `约 ${sizeLine}` }, { k: '楼层', v: d.floors }, { k: '起售价', v: money(d.start) } ] } ]
      : d.types.split('–').length > 1
        ? [ { b: d.types.replace(/[^\d–]/g, '').split('–')[0] || '1', span: '居起', h: 'Apartments', rows: [ { k: '面积区间', v: `约 ${sizeLine}` }, { k: '类型', v: d.types }, { k: '起售价', v: money(d.start) } ] } ]
        : [ { b: '多', span: '户型', h: d.types, rows: [ { k: '面积区间', v: `约 ${sizeLine}` }, { k: '类型', v: d.types }, { k: '起售价', v: money(d.start) } ] } ],
    disclosure: `<strong>${d.units}。</strong> ${d.name} 由 ${d.buildings}（${d.floors}）组成，提供 ${d.types} 产品，面积约 ${sizeLine}；起售价 ${money(d.start)}（示意）。具体可售房源、面积、套数与价格以开发商当期分户表和价单为准。`,
    payment: { big: d.payment.replace(/ /g, ''), legend: d.payment.split(' / ').map((x, i) => `${x}% ${['预订时', '建造期间', '交付时'][i]}`) },
    schedule: { start: d.constr === '在建' ? '已开工' : '待开工', handover: d.handover, note: `施工状态：${d.constr}；付款计划显示预计 ${d.handover} 交付。开工与交付时间以开发商正式文件及 SPA 为准。` },
  };

  return {
    slug: d.slug, name: d.name, cn: d.cn, mondayItemId: d.item, footerDate: '2026-07-22',
    seo: { desc: `${d.name}（${d.cn}）位于${d.comm}，BEYOND 出品，${d.units}，${d.types}，${d.payment} 付款，${money(d.start)}。`, ogDesc: `${d.comm} · BEYOND 出品 · ${d.units} · ${d.types}。查看官方影像、产品、区位、社区与开发商资料。` },
    hero: { kicker: d.kicker, span: d.tagline, en: `${d.name.toUpperCase()} · ${d.enTag}`, copy: d.blurb },
    facts, video: { id: d.video }, gallery,
    overview: { title: `${d.comm} 的新篇，`, em: '让景观成为生活的底座', photo: heroName(3), paras: overviewParas, metrics },
    highlights, location: {
      title: `${d.comm}，`, em: d.comm === 'Palm Jumeirah' ? '棕榈岛的滨海门户' : '迪拜海事城门户',
      mapCity: `${d.comm}, Dubai`, mapZoom: 12, mapQuery: `q=${encodeURIComponent(d.name + ', ' + d.comm + ', Dubai')}`,
      officialCaption: '开发商官方区位示意 · 距离为公开资料整理约数',
      distances: d.comm === 'Palm Jumeirah'
        ? [ { t: '约 5 分钟', p: 'Nakheel Mall' }, { t: '约 15 分钟', p: 'Dubai Marina' }, { t: '约 20 分钟', p: 'Downtown / 哈利法塔' }, { t: '约 30 分钟', p: '迪拜国际机场' } ]
        : [ { t: '约 5 分钟', p: 'Mina Rashid 港区' }, { t: '约 10 分钟', p: 'Downtown / DIFC' }, { t: '约 12 分钟', p: '哈利法塔' }, { t: '约 15 分钟', p: 'Dubai Marina' }, { t: '约 20 分钟', p: '迪拜国际机场' } ],
    },
    product, amenities, community, units,
  };
}

let ok = 0;
for (const d of P) {
  // 1) 写内容 JSON
  writeFileSync(join(LAND, `${d.slug}.json`), JSON.stringify(toLanding(d), null, 2) + '\n');
  // 2) 装配 deliverables/<slug>/assets：hero 9 张 + card + 二维码
  const aDir = join(DELIV, d.slug, 'assets');
  mkdirSync(aDir, { recursive: true });
  const src = join(PUBIMG, d.assetDir);
  for (let i = 1; i <= 9; i++) {
    const s = join(src, `hero-${i}.webp`);
    if (existsSync(s)) copyFileSync(s, join(aDir, `hero-${i}.webp`));
  }
  const card = join(src, 'card.webp'); if (existsSync(card)) copyFileSync(card, join(aDir, 'card.webp'));
  for (const q of ['danfeng-website-qr.png', 'danfeng-wechat-qr.png']) {
    const s = join(QRSRC, q); if (existsSync(s)) copyFileSync(s, join(aDir, q));
  }
  // 3) 跑 gen-landing
  try {
    execSync(`node ${join(WEB, 'scripts', 'gen-landing.mjs')} ${d.slug}`, { cwd: WEB, stdio: 'inherit' });
    ok++;
  } catch (e) { console.error(`✗ gen-landing 失败 ${d.slug}: ${e.message}`); }
}
console.log(`\n══ 完成 ${ok}/${P.length} 个 BEYOND 页 ══`);
