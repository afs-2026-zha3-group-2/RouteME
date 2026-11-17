/**
 * 天气卡的文案集中地：所有面向用户的中文都从这里取，组件不写死字符串。
 */
export const weatherMessages = {
  title: '目的地天气',
  source: 'Open-Meteo 真实预报',
  firstDaySuffix: '（首日）',
  idle: '选择目的地与旅行日期后展示天气。',
  loading: '正在获取目的地天气…',
  failed: '天气暂时获取不到，可以重试；不影响继续编辑路线。',
  retry: '重试',
  outOfRange: '暂无该日期天气预报。',
  outOfRangeHint: 'Open-Meteo 只提供未来约 16 天的预报，可以换一个更近的日期。',
  rain: '雨',
  heat: '高温',
  uv: '防晒',
  cold: '保暖',
  temperatureGap: '温差',
  wind: '风',
  calm: '平稳',
  factsRainProbability: '降雨概率',
  factsPrecipitation: '降水量',
  factsWind: '风速',
  factsUv: '紫外线',
} as const;

/** 提醒类别 → 展示标签；未知类别回落为通用「提醒」，避免后端新增类别时前端崩溃。 */
export function reminderLabel(code: string): string {
  switch (code) {
    case 'rain':
      return weatherMessages.rain;
    case 'heat':
      return weatherMessages.heat;
    case 'uv':
      return weatherMessages.uv;
    case 'cold':
      return weatherMessages.cold;
    case 'temperature_gap':
      return weatherMessages.temperatureGap;
    case 'wind':
      return weatherMessages.wind;
    case 'calm':
      return weatherMessages.calm;
    default:
      return '提醒';
  }
}