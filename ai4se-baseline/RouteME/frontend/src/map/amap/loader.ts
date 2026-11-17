/** 高德 JS API 2.0 脚本加载器：单例、幂等，优先走同源代理。 */

import { amapConfig, amapServiceHost } from './config';
import type { AmapNamespace } from './types';

export class AmapLoadError extends Error {
  readonly code: 'MISSING_JS_KEY' | 'SCRIPT_LOAD_FAILED';

  constructor(code: AmapLoadError['code'], message: string) {
    super(message);
    this.name = 'AmapLoadError';
    this.code = code;
  }
}

let pending: Promise<AmapNamespace> | null = null;

function createScript(): Promise<AmapNamespace> {
  return new Promise<AmapNamespace>((resolve, reject) => {
    // serviceHost 让 JS API 的搜索/路线请求打到后端代理；Web 服务 Key 不透出。
    if (amapConfig.proxyPath !== 'off') {
      window._AMapSecurityConfig = { serviceHost: amapServiceHost() };
    } else if (amapConfig.securityCode !== '') {
      window._AMapSecurityConfig = { securityJsCode: amapConfig.securityCode };
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(amapConfig.jsKey)}`;
    script.onload = () => {
      if (window.AMap !== undefined) {
        resolve(window.AMap);
      } else {
        reject(new AmapLoadError('SCRIPT_LOAD_FAILED', '高德地图脚本已加载，但 AMap 命名空间不可用'));
      }
    };
    script.onerror = () => {
      reject(new AmapLoadError('SCRIPT_LOAD_FAILED', '高德地图脚本加载失败，请检查网络或 JS API Key'));
    };
    document.head.appendChild(script);
  });
}

/** 加载并复用同一个 AMap 命名空间；失败后允许下次重试。 */
export function loadAmap(): Promise<AmapNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new AmapLoadError('SCRIPT_LOAD_FAILED', '高德地图只能在浏览器中加载'));
  }
  if (window.AMap !== undefined) {
    return Promise.resolve(window.AMap);
  }
  if (pending !== null) {
    return pending;
  }
  if (amapConfig.jsKey === '') {
    return Promise.reject(
      new AmapLoadError('MISSING_JS_KEY', '未配置 VITE_AMAP_JS_KEY，无法加载高德地图'),
    );
  }
  pending = createScript().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}