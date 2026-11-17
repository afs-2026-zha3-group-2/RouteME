import type { MyTrips, TripApplication, TripSummary } from '../types';

export type MineTab = 'published' | 'applied' | 'matched' | 'completed';

export type MineAction =
  | 'view'
  | 'applications'
  | 'complete'
  | 'cancel'
  | 'cancelTrip'
  | 'chat'
  | 'leave'
  | 'share';

export type MineActionContext = {
  group: MineTab;
  trip: TripSummary;
  application?: TripApplication;
};

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function groupCounts(data: MyTrips): Record<MineTab, number> {
  return {
    published: data.published.length,
    applied: data.applied.length,
    matched: data.matched.length,
    completed: data.completed.length,
  };
}

export function pendingCountFor(data: MyTrips, tripId: number): number {
  const entry = (data.pending_applications ?? []).find((item) => item.trip_id === tripId);
  return entry?.count ?? 0;
}

/**
 * 待处理提醒的目标行程：取第一条仍有待处理申请的已发布行程。
 * 旧后端没有 pending_applications 时返回 null，页面不渲染入口。
 */
export function pendingTargetTripId(data: MyTrips): number | null {
  return (data.pending_applications ?? [])[0]?.trip_id ?? null;
}

export function formatDateRange(start: string, end: string): string {
  const startLabel = formatMonthDay(start);
  const endLabel = formatMonthDay(end);
  if (startLabel === '' || endLabel === '') {
    return '';
  }
  return `${startLabel} → ${endLabel}`;
}

function formatMonthDay(iso: string): string {
  const [, month, day] = iso.split('-');
  if (month === undefined || day === undefined) {
    return '';
  }
  return `${Number(month)}月${Number(day)}日`;
}

export function dayLabel(iso: string): string {
  if (iso === '') {
    return '日期待定';
  }
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '日期待定' : `${WEEKDAYS[date.getDay()]}出发`;
}

/**
 * 每个分组可用的行内动作，只包含已交付能力（不含编辑 / 删除 / 参考发布）。
 */
export function actionsFor(context: MineActionContext): MineAction[] {
  const { group, trip, application } = context;
  if (group === 'published') {
    if (trip.status === 'cancelled') {
      return ['view'];
    }
    const actions: MineAction[] = ['view', 'applications'];
    if (trip.status === 'ongoing') {
      actions.push('complete');
    }
    if (trip.status === 'recruiting' || trip.status === 'full') {
      actions.push('cancelTrip');
    }
    return actions;
  }
  if (group === 'applied') {
    const actions: MineAction[] = ['view'];
    if (application?.status === 'pending') {
      actions.push('cancel');
    }
    if (application?.status === 'accepted') {
      actions.push(trip.status === 'completed' ? 'share' : 'chat');
    }
    return actions;
  }
  if (group === 'matched') {
    return trip.status === 'cancelled' ? ['chat', 'view'] : ['chat', 'view', 'leave'];
  }
  return ['share', 'view'];
}