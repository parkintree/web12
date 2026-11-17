/**
 * localStorage 的可用性探测。
 *
 * 「存在 localStorage 对象」不等于「能写」：隐私模式 / 某些浏览器策略下，
 * getItem 可以正常返回，setItem 却直接抛 QuotaExceededError。
 * 因此先探测一次写入，不可用就统一回落到 null，业务层只处理一个分支。
 */

import type { StorageLike } from '../types';

const PROBE_KEY = 'web12.storage-probe';

export function getLocalStorage(): StorageLike | null {
  try {
    const local = window.localStorage;
    local.setItem(PROBE_KEY, '1');
    local.removeItem(PROBE_KEY);
    return local;
  } catch {
    return null;
  }
}
