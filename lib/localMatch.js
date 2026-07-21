// ============================================================
// 本地匹配兜底入口（演示用 / Phase 0）。
// 现已升级为多因子加权引擎，见 lib/match.js。
// 仅在后端 Dify 未配置 / 不可达时启用，生成「演示匹配」报告。
// 严格价格护栏：只用开盘起价，绝不出现实时价格/市场数字。
// ============================================================
import { PROJECTS } from './catalog';
import { runMatch } from './match';

export function localMatch(profile = {}, freeText = '') {
  return runMatch(PROJECTS, { ...profile, freeText });
}
