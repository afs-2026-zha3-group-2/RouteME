export const profileMessages = {
  title: '旅行者资料',
  thisIsYou: '这是你',
  joinedPrefix: '加入于',
  statsPublished: '发布行程',
  statsCompleted: '已完成',
  statsJoined: '参与同行',
  statsShared: '游后分享',
  sharedInterests: '你们的共同兴趣：',
  privacyNote:
    '平台只展示昵称、头像、身份/专业、加入时间、简介与旅行兴趣。电话、证件、精确住址和实时位置不会向任何人公开，包括已匹配的同行者。',
  loading: '正在读取资料',
  loadFailed: '资料加载失败',
  userNotFound: '用户不存在',
  close: '关闭',
  // 本人成长进度（他人不返回经验，不调用这些文案）
  growthProgressTitle: '成长经验',
  growthExpCounter: (exp: number, cap: number) => `${exp} / ${cap} EXP`,
  /** 底部提示只说明每日正向经验上限与今日已获取的额度。 */
  growthDailyCounter: (used: number, limit: number) => `今日经验 ${used} / ${limit}`,
  growthMaxHint: '已满级，经验继续累计',
} as const;
