/**
 * AI 规划页全部文案集中（design §4.2 / §4.6）：组件不拼句子。
 * 错误映射：AI_NOT_CONFIGURED → 尚未配置；AI_UPSTREAM_ERROR / AI_INVALID_OUTPUT → 生成失败；
 * WEATHER_UPSTREAM_ERROR → 天气获取失败；高德沿用 amapErrorMessage。
 */
import type { AiDuration, AiPace, AiTravelMode } from '../types';
import { centsToYuan } from './budgetMath';

export const aiMessages = {
  /** AC13：无真实价格来源的费用恒标「AI 估算」。 */
  aiEstimate: 'AI 估算',
  overBudget: (overCents: number) => `预计超过预算 ${centsToYuan(overCents)} 元`,

  pageTitle: 'AI 智能规划',
  pageSubtitle: '输入旅行条件，AI 结合高德地图与真实天气生成可执行的游玩路线',
  generate: '✨ AI 推荐路线',
  regenerate: '重新生成',
  save: '保存行程',
  reduceBudget: 'AI 帮我降低预算',
  retry: '重试',
  loading: 'AI 正在结合天气与地图生成推荐行程…',
  generatingHint: '通常需要 10–30 秒，请稍候',

  /* ---------- 对话式布局（参考稿 v2） ---------- */
  chatTitle: '用 AI，规划你的专属旅程',
  chatSubtitle: '告诉我你的想法，生成路线、美食、景点和实用建议。',
  conditionsTitle: '规划条件',
  conditionsHint: '必填：出发地 / 目的地 / 日期；其余越详细，路线越贴合你',
  welcomeTitle: '你好！我是 RouteMe AI 旅行助手',
  welcomeIntro: '我可以帮你快速规划专属的旅行路线，包括景点、美食、交通、预算和实用建议。',
  welcomePrompt: '你可以这样告诉我你的需求：',
  welcomeDetail: '或者直接输入你的想法，越详细越好哦～',
  composerLabel: '告诉我你的旅行想法',
  composerPlaceholder: '继续问我，或者告诉我你的新需求…',
  send: '发送',
  planReady: '好的！我已为你生成专属行程，结合美食、拍照、预算和交通，推荐如下方案：',
  planReadyFor: (note: string) => `已按「${note}」重新生成行程：`,
  planDays: (days: number) => `${days} 天行程`,
  planPreviewHint: '完整时间轴、路线距离与预算都在右侧预览里，可继续调整后发布为行程。',
  previewTitle: '完整行程预览',
  previewHint: '可直接保存或发布行程',
  previewEmptyHint: '填写条件或直接告诉 AI 你的想法',
  export: '导出行程',
  publish: '发布为行程',
  exported: (title: string) => `已导出「${title}」为 Markdown 文件。`,
  exportEmpty: '还没有可导出的行程，先生成一条路线吧。',
  mapTitle: '路线地图',
  mapSubtitle: '距离与时间来自高德地图',
  mapAriaLabel: 'AI 推荐路线地图',
  budgetEmpty: '生成行程后展示 AI 估算预算',
  tipsEmpty: '生成行程后展示 AI 出行建议',
  errorHint: '可以补充条件后重试，或换一个目的地。',
  intentDestination: (name: string) => `已把目的地识别为「${name}」，正在按你的要求规划。`,
  intentOriginDefault: (name: string) => `没有填写出发地，先用「${name}」市中心作为出发地，可在「规划条件」里修改。`,
  intentDestinationMissing: (name: string) =>
    `没有在高德地图找到「${name}」，请在「规划条件」里手动选择目的地。`,
  intentBudget: (yuan: string) => `预算 ${yuan} 元`,
  /** 只把已识别的条件拼成一句摘要；空数组返回空串。 */
  intentSummary: (parts: Array<string | null>) => {
    const list = parts.filter((part): part is string => part !== null && part !== '');
    return list.join(' · ');
  },
  chatNeedForm: '我还需要出发地、目的地和日期才能规划路线，先在上面的「规划条件」里补齐吧。',
  /** 只点名真正缺的字段，避免把已识别到的目的地也算作缺失。 */
  chatMissing: (fields: string) =>
    `还缺${fields}，在上面的「规划条件」里补齐后我就开始规划。`,

  aiNotConfigured: 'AI 服务尚未配置：请联系管理员配置 AI 服务后重试。',
  aiFailed: 'AI 生成失败，请重试。',
  weatherFailed: '天气获取失败，请稍后重试。',
  routeFailed: '路线计算失败，请稍后重试。',
  locateFailed: '定位失败，请搜索或地图选点',
  locateLoading: '正在定位…',

  originLabel: '出发地',
  destinationLabel: '目的地',
  dateLabel: '旅行日期',
  durationLabel: '游玩时间',
  budgetLabel: '预算（元）',
  modeLabel: '出行方式',
  interestsLabel: '兴趣偏好',
  paceLabel: '行程节奏',
  useCurrentLocation: '使用当前定位',
  currentLocation: '当前位置',
  mapPick: '地图选点',
  mapPickTarget: '选点目标',
  mapPickHint: '点击地图选择附近地点',
  mapCandidates: '附近地点',
  mapCandidatesEmpty: '附近没有找到地点，换个位置点击试试',
  closeCandidates: '关闭附近地点',
  backHome: '返回首页',
  placeSearchPlaceholder: '搜索地点，如「广州南站」',
  requiredHint: '填写出发地、目的地和日期后即可生成',

  unresolved: '未定位',
  minStops: '至少保留 2 个景点',
  minRouteStops: '至少 2 个可定位景点才能计算路线',
  remove: (name: string) => `删除 ${name}`,
  replace: (name: string) => `更换 ${name}`,
  moveUp: (name: string) => `上移 ${name}`,
  moveDown: (name: string) => `下移 ${name}`,
  replaceSearchPlaceholder: '搜索替换景点，如「永庆坊」',
  replaceCancel: '取消更换',
  manualReplaceReason: '手动更换的景点',
  timelineTitle: 'AI 行程',
  emptyResult: '点击「✨ AI 推荐路线」后，这里会展示天气、AI Tips、预算估算与完整行程',
  stayMinutes: (minutes: number) => `停留 ${minutes} 分钟`,
  dayLabel: (day: number) => `第 ${day} 天`,
  indoorTag: '室内',

  weatherTitle: '天气',
  weatherEmpty: '选择目的地和日期后，这里会展示真实天气',
  weatherOutOfRange: '暂无该日期天气预报，可换一个更近的日期。',
  weatherLoading: '天气获取中…',
  weatherSource: 'Open-Meteo 真实预报',
  precipitationProbability: '降雨概率',
  windSpeed: '风速',
  uvIndex: '紫外线',
  tipsTitle: 'AI Tips',
  packingTitle: '建议携带',

  budgetTitle: '预算',
  budgetTransport: '交通',
  budgetTickets: '门票',
  budgetFood: '餐饮',
  budgetOther: '其他',
  budgetTotal: '合计',
  budgetUser: '我的预算',
  budgetNote: '无真实价格来源，全部为 AI 估算',

  statsDistance: '预计距离',
  statsDuration: '预计交通时间',
  statsTotal: '预计总时长',
  statsSource: '距离与时间来自高德地图',
  routeLoading: '路线计算中…',

  saveFailed: '保存失败，请重试。',
  prefillBanner: '来自 AI 推荐方案，可修改后发布',
  prefillError: 'AI 行程预填失败：快照不存在或不属于当前用户，仍可手动填写发布。',
  prefillDestinationHint: '未能自动识别目的地行政区，请手动选择',
  sourceBadge: 'AI 推荐',
  aiSummaryTitle: 'AI 行程摘要',
  tryAiLink: '试试 AI 推荐路线',

  durationOptions: { half_day: '半天', one_day: '1 天', two_day: '2 天' } as Record<AiDuration, string>,
  durationLabels: { half_day: '半日游', one_day: '1 日游', two_day: '2 日游' } as Record<AiDuration, string>,
  paceOptions: { relaxed: '宽松', moderate: '适中', compact: '紧凑' } as Record<AiPace, string>,
  modeOptions: { transit: '公共交通', walking: '步行', driving: '驾车' } as Record<AiTravelMode, string>,
};

/** generate 接口错误码 → 可读文案（ApiError.code）。 */
export function aiErrorMessage(code: string): string {
  switch (code) {
    case 'AI_NOT_CONFIGURED':
      return aiMessages.aiNotConfigured;
    case 'AI_UPSTREAM_ERROR':
    case 'AI_INVALID_OUTPUT':
      return aiMessages.aiFailed;
    default:
      return aiMessages.aiFailed;
  }
}