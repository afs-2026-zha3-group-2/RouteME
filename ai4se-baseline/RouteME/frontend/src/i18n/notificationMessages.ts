/**
 * 通知相关文案。徽标只显示数字，可读语义放在外层的 `aria-label` 里。
 */
const TYPE_LABELS: Record<string, string> = {
  TRIP: '行程',
  APPLICATION: '同行申请',
  CHAT: '聊天消息',
  CREDIT: '信用分',
  REPORT: '举报',
  ACCOUNT: '账号',
  SERVICE: '客服',
  SYSTEM: '系统',
};

export const notificationMessages = {
  bellLabel: '通知',
  bellLabelUnread: (count: number) => `通知，${count} 条未读`,
  title: '通知',
  centerTitle: '通知中心',
  centerEntry: '通知中心',
  centerEntryUnread: (count: number) => `通知中心，${count} 条未读`,
  viewAll: '查看全部通知',
  markAll: '全部已读',
  empty: '暂时没有新通知',
  emptyOfType: (label: string) => `暂无${label}通知`,
  loadFailed: '通知加载失败，请稍后重试',
  retry: '重试',
  unread: '未读',
  read: '已读',
  priorityHigh: '重要',
  unavailable: '相关内容当前不可查看',
  allTypes: '全部',
  typeFilter: (label: string, count: number) => `${label} ${count}`,
  unreadTotal: (count: number) => `${count} 条未读`,
  allRead: '全部通知已读',
  chatLabel: '聊天',
  chatUnreadLabel: (count: number) => `聊天，${count} 条未读消息`,
  /** 条目上的类型标签：让八类通知不只靠正文措辞区分。 */
  typeLabel: (type: string) => TYPE_LABELS[type] ?? '通知',
};

export const creditRecordMessages = {
  title: '信用记录',
  subtitle: '信用分的每次变动都会保留为一条记录，通知不会因信用状态变化而删除。',
  empty: '暂时没有信用记录',
  learn: '前往安全学习',
  back: '返回通知中心',
};

export const reportDetailMessages = {
  title: '举报详情',
  subtitle: '这里只展示你提交举报时已经知道的信息；管理员备注与他人的处罚细节不会展示。',
  code: '举报编号',
  target: '举报对象',
  reason: '举报原因',
  status: '处理状态',
  createdAt: '提交时间',
  processingAt: '开始处理',
  resolvedAt: '处理完成',
  unavailable: '相关内容当前不可查看',
  notFound: '没有找到这条举报，可能已不在你的举报记录中。',
  history: '我的举报记录',
  empty: '你还没有提交过举报',
  loadFailed: '举报记录加载失败，请稍后重试',
  retry: '重试',
  back: '返回通知中心',
  targetType: (type: string) => {
    if (type === 'trip') {
      return '行程';
    }
    if (type === 'user') {
      return '用户';
    }
    if (type === 'experience') {
      return '旅行体验';
    }
    return type;
  },
  reasonLabel: (reason: string) => {
    const labels: Record<string, string> = {
      harassment: '骚扰他人',
      fake: '虚假信息',
      safety: '安全隐患',
      other: '其他',
    };
    return labels[reason] ?? reason;
  },
  statusLabel: (status: string) => {
    const labels: Record<string, string> = {
      PENDING: '待处理',
      PROCESSING: '处理中',
      RESOLVED: '已处理',
      REJECTED: '未发现违规',
    };
    return labels[status] ?? status;
  },
};