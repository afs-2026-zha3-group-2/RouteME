export type Route =
  | { name: 'home' }
  | { name: 'create'; fromTripId?: number }
  | { name: 'detail'; tripId: number }
  | { name: 'applications'; tripId: number }
  | { name: 'mine' }
  | { name: 'chat'; tripId?: number; userId?: number }
  | { name: 'share'; tripId: number }
  | { name: 'profileSetup' }
  | { name: 'userProfile'; userId: number }
  | { name: 'map'; provinceCode?: string; cityCode?: string }
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
    const source = Number(params.get('from'));
    return Number.isInteger(source) && source > 0
      ? { name: 'create', fromTripId: source }
      : { name: 'create' };
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
    return route.fromTripId === undefined ? '#/trips/new' : `#/trips/new?from=${route.fromTripId}`;
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