/**
 * 通知相关文案。徽标只显示数字，可读语义放在外层的 `aria-label` 里。
 */
const TYPE_LABELS: Record<string, string> = {
  application_received: '同行申请',
  application_accepted: '申请通过',
  application_rejected: '申请未通过',
  message: '聊天消息',
};

export const notificationMessages = {
  bellLabel: '通知',
  bellLabelUnread: (count: number) => `通知，${count} 条未读`,
  title: '通知',
  markAll: '全部已读',
  empty: '暂时没有新通知',
  loadFailed: '通知加载失败，请稍后重试',
  retry: '重试',
  unread: '未读',
  chatLabel: '聊天',
  chatUnreadLabel: (count: number) => `聊天，${count} 条未读消息`,
  /** 条目上的类型标签：让四类通知不只靠正文措辞区分。 */
  typeLabel: (type: string) => TYPE_LABELS[type] ?? '通知',
};