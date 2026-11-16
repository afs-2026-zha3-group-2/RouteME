/**
 * 资料表单的选项字典：与 `openapi.yaml` 0.7.0 和后端 `ProfileConstant` 同值。
 * 任一处不一致都视为契约缺陷。
 */

export const GENDERS = ['男', '女', '其他'] as const;

export const JOBS = ['学生', '上班族', '自由职业', '其他'] as const;

export const TRAVEL_STYLES = ['特种兵', '休闲游', '深度游', '随性游'] as const;

export const MBTI_TYPES = [
  'INTJ',
  'INTP',
  'ENTJ',
  'ENTP',
  'INFJ',
  'INFP',
  'ENFJ',
  'ENFP',
  'ISTJ',
  'ISFJ',
  'ESTJ',
  'ESFJ',
  'ISTP',
  'ISFP',
  'ESTP',
  'ESFP',
] as const;

export type InterestOption = {
  /** 契约与响应里保存的规范值。 */
  value: string;
  /** 界面上展示的文案。 */
  label: string;
};

/** 预设兴趣：值为规范值，展示名可不同（例如 Citywalk → 城市漫步）。 */
export const PRESET_INTERESTS: readonly InterestOption[] = [
  { value: '自然', label: '自然风景' },
  { value: '历史', label: '文化历史' },
  { value: '展览', label: '看展' },
  { value: '城市漫步', label: 'Citywalk' },
  { value: '美食', label: '美食' },
  { value: '摄影', label: '摄影' },
  { value: '徒步', label: '徒步' },
  { value: '户外', label: '户外' },
  { value: '露营', label: '露营' },
  { value: '夜景', label: '夜景' },
  { value: '骑行', label: '骑行' },
  { value: '咖啡', label: '咖啡' },
];

const INTEREST_LABELS = new Map(PRESET_INTERESTS.map((item) => [item.value, item.label]));

/** 已选兴趣的展示文案：预设值映射回 label，自定义标签原样展示。 */
export function interestLabel(value: string): string {
  return INTEREST_LABELS.get(value) ?? value;
}

/** 城市建议：可自由输入，仅作为 AutoComplete 选项。 */
export const CITY_NAMES: readonly string[] = [
  '广州',
  '深圳',
  '杭州',
  '成都',
  '上海',
  '北京',
  '珠海',
  '厦门',
  '重庆',
  '西安',
  '南京',
  '武汉',
  '长沙',
  '苏州',
  '青岛',
];

export const MIN_INTERESTS = 3;
export const MAX_INTERESTS = 5;
export const MAX_INTEREST_LENGTH = 12;

export const MAX_NICKNAME_LENGTH = 20;
export const MAX_CITY_LENGTH = 40;
export const MAX_SCHOOL_LENGTH = 80;
export const MAX_BIO_LENGTH = 500;

export const MIN_BIRTHDAY = '1900-01-01';