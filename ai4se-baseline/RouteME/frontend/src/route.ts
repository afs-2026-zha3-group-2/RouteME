export type Route =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'detail'; tripId: number }
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
  if (route.name === 'detail') {
    return `#/trips/${route.tripId}`;
  }
  return '#/';
}