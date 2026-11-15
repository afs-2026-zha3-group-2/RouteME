export type Route =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'detail'; tripId: number }
  | { name: 'applications'; tripId: number }
  | { name: 'mine' }
  | { name: 'chat'; tripId: number; userId: number }
  | { name: 'notFound' };

export function parseRoute(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const path = (raw.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  if (path === '/') {
    return { name: 'home' };
  }
  if (path === '/trips/new') {
    return { name: 'create' };
  }
  if (path === '/mine') {
    return { name: 'mine' };
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
    return '#/trips/new';
  }
  if (route.name === 'mine') {
    return '#/mine';
  }
  if (route.name === 'chat') {
    return `#/chat/${route.tripId}/${route.userId}`;
  }
  if (route.name === 'applications') {
    return `#/trips/${route.tripId}/applications`;
  }
  if (route.name === 'detail') {
    return `#/trips/${route.tripId}`;
  }
  return '#/';
}