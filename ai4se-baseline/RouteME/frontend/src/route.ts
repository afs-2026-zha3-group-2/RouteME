export type Route =
  | { name: 'home' }
  | { name: 'create'; fromTripId?: number; aiItineraryId?: number }
  | { name: 'aiPlanner' }
  | { name: 'detail'; tripId: number }
  | { name: 'applications'; tripId: number }
  | { name: 'mine' }
  | { name: 'chat'; tripId?: number; userId?: number }
  | { name: 'share'; tripId: number }
  | { name: 'profileSetup' }
  | { name: 'userProfile'; userId: number }
  | { name: 'creditLearning' }
  | { name: 'map'; provinceCode?: string; cityCode?: string }
  | { name: 'help' }
  | { name: 'adminUsers' }
  | { name: 'adminUserDetail'; userId: number }
  | { name: 'adminReports' }
  | { name: 'adminReportDetail'; reportId: number }
  | { name: 'adminService' }
  | { name: 'adminServiceDetail'; sessionId: number }
  | { name: 'notFound' };

export function parseRoute(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [rawPath, rawQuery] = raw.split('?');
  const params = new URLSearchParams(rawQuery ?? '');
  const path = (rawPath || '/').replace(/\/+$/, '') || '/';
  if (path === '/') {
    return { name: 'home' };
  }
  if (path === '/trips/new') {
    // AI 快照来源优先于参考行程来源（design §4.4）。
    const ai = Number(params.get('ai'));
    if (Number.isInteger(ai) && ai > 0) {
      return { name: 'create', aiItineraryId: ai };
    }
    const source = Number(params.get('from'));
    return Number.isInteger(source) && source > 0
      ? { name: 'create', fromTripId: source }
      : { name: 'create' };
  }
  if (path === '/ai-planner') {
    return { name: 'aiPlanner' };
  }
  if (path === '/mine') {
    return { name: 'mine' };
  }
  // 三级旅行地图：#/map（中国）→ #/map/{省码} → #/map/{省码}/{市码}。
  const map = /^\/map(?:\/(\d{6}))?(?:\/(\d{6}))?$/.exec(path);
  if (map) {
    return { name: 'map', provinceCode: map[1], cityCode: map[2] };
  }
  if (path === '/profile/setup') {
    return { name: 'profileSetup' };
  }
  if (path === '/help') {
    return { name: 'help' };
  }
  if (path === '/admin/users') {
    return { name: 'adminUsers' };
  }
  const adminUserDetail = /^\/admin\/users\/(\d+)$/.exec(path);
  if (adminUserDetail) {
    return { name: 'adminUserDetail', userId: Number(adminUserDetail[1]) };
  }
  if (path === '/admin/reports') {
    return { name: 'adminReports' };
  }
  const adminReportDetail = /^\/admin\/reports\/(\d+)$/.exec(path);
  if (adminReportDetail) {
    return { name: 'adminReportDetail', reportId: Number(adminReportDetail[1]) };
  }
  if (path === '/admin/service') {
    return { name: 'adminService' };
  }
  const adminServiceDetail = /^\/admin\/service\/(\d+)$/.exec(path);
  if (adminServiceDetail) {
    return { name: 'adminServiceDetail', sessionId: Number(adminServiceDetail[1]) };
  }
  // 安全学习独立页：入口只在发布行程被拦截时出现，但页面可直接深链。（REQ-026 / OQ-6）
  if (path === '/credit/learning') {
    return { name: 'creditLearning' };
  }
  const profile = /^\/users\/(\d+)$/.exec(path);
  if (profile) {
    return { name: 'userProfile', userId: Number(profile[1]) };
  }
  const share = /^\/share\/(\d+)$/.exec(path);
  if (share) {
    return { name: 'share', tripId: Number(share[1]) };
  }
  if (path === '/chat') {
    return { name: 'chat' };
  }
  const chat = /^\/chat\/(\d+)\/(\d+)$/.exec(path);
  if (chat) {
    return { name: 'chat', tripId: Number(chat[1]), userId: Number(chat[2]) };
  }
  const applications = /^\/trips\/(\d+)\/applications$/.exec(path);
  if (applications) {
    return { name: 'applications', tripId: Number(applications[1]) };
  }
  const detail = /^\/trips\/(\d+)$/.exec(path);
  if (detail) {
    return { name: 'detail', tripId: Number(detail[1]) };
  }
  return { name: 'notFound' };
}

export function routeToHash(route: Route): string {
  if (route.name === 'create') {
    if (route.aiItineraryId !== undefined) {
      return `#/trips/new?ai=${route.aiItineraryId}`;
    }
    return route.fromTripId === undefined ? '#/trips/new' : `#/trips/new?from=${route.fromTripId}`;
  }
  if (route.name === 'aiPlanner') {
    return '#/ai-planner';
  }
  if (route.name === 'mine') {
    return '#/mine';
  }
  if (route.name === 'chat') {
    return route.tripId === undefined || route.userId === undefined
      ? '#/chat'
      : `#/chat/${route.tripId}/${route.userId}`;
  }
  if (route.name === 'share') {
    return `#/share/${route.tripId}`;
  }
  if (route.name === 'applications') {
    return `#/trips/${route.tripId}/applications`;
  }
  if (route.name === 'detail') {
    return `#/trips/${route.tripId}`;
  }
  if (route.name === 'profileSetup') {
    return '#/profile/setup';
  }
  if (route.name === 'help') {
    return '#/help';
  }
  if (route.name === 'adminUsers') {
    return '#/admin/users';
  }
  if (route.name === 'adminUserDetail') {
    return `#/admin/users/${route.userId}`;
  }
  if (route.name === 'adminReports') {
    return '#/admin/reports';
  }
  if (route.name === 'adminReportDetail') {
    return `#/admin/reports/${route.reportId}`;
  }
  if (route.name === 'adminService') {
    return '#/admin/service';
  }
  if (route.name === 'adminServiceDetail') {
    return `#/admin/service/${route.sessionId}`;
  }
  if (route.name === 'creditLearning') {
    return '#/credit/learning';
  }
  if (route.name === 'userProfile') {
    return `#/users/${route.userId}`;
  }
  if (route.name === 'map') {
    if (route.provinceCode === undefined) {
      return '#/map';
    }
    return route.cityCode === undefined
      ? `#/map/${route.provinceCode}`
      : `#/map/${route.provinceCode}/${route.cityCode}`;
  }
  return '#/';
}
