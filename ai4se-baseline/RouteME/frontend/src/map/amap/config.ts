/** 高德 JS API 2.0 前端配置（Key 来自环境变量，不写进业务组件）。 */

export type AmapConfig = {
  jsKey: string;
  securityCode: string;
  /** 同源代理前缀；设为 `off` 时改用 securityJsCode 直连（不推荐）。 */
  proxyPath: string;
};

function readEnv(name: string): string {
  const value: unknown = import.meta.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeProxyPath(raw: string): string {
  if (raw === 'off') {
    return 'off';
  }
  const path = raw === '' ? '/api/amap' : raw;
  return path.startsWith('/') ? path : `/${path}`;
}

export const amapConfig: AmapConfig = {
  jsKey: readEnv('VITE_AMAP_JS_KEY'),
  securityCode: readEnv('VITE_AMAP_SECURITY_CODE'),
  proxyPath: normalizeProxyPath(readEnv('VITE_AMAP_PROXY_PATH')),
};

/** 高德 JS API 的 serviceHost：同源代理，Web 服务 Key 由后端补上。 */
export function amapServiceHost(): string {
  // 高德安全模式要求代理服务以 _AMapService 作为一级路由（例如 /_AMapService）。
  return `${window.location.origin}/_AMapService`;
}

export function amapProxyUrl(path: string): string {
  return `${amapConfig.proxyPath}/${path.replace(/^\/+/, '')}`;
}