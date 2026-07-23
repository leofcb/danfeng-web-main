// 采用 WEB-LP-V1.3 独立 HTML 母版、静态托管于 public/projects/<slug>/index.html 的项目 slug。
// 这些 slug 从 Next SSG [slug] 路由排除，并由 next.config beforeFiles 重写到静态 index.html，
// 使 /projects/<slug> 正式指向独立落地页（覆盖 catalog 自动页）。新增独立页项目时在此登记即可。
export const STANDALONE_PROJECT_SLUGS = ['hado', 'sensia', 'talea', 'arancia-yards', 'aria', 'arancia-yards-2', 'kanyon', 'soulever', '31-above', 'saria', 'the-mural', 'orise', 'passo', 'aeon'];

// 采用 WEB-DEV-V1 独立 HTML 母版、静态托管于 public/developers/<slug>/index.html 的开发商 slug。
// 从 Next SSG [slug] 路由排除，并由 next.config beforeFiles 重写到静态 index.html。
export const STANDALONE_DEVELOPER_SLUGS = ['beyond'];

// 采用 WEB-COMM-V1 独立 HTML 母版、静态托管于 public/communities/<slug>/index.html 的社区 slug。
// 从 Next SSG [slug] 路由排除，并由 next.config beforeFiles 重写到静态 index.html。
export const STANDALONE_COMMUNITY_SLUGS = ['business-bay'];
