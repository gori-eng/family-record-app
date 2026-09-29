/**
 * 기기에 작은 값을 남겨두는 서랍 — 웹과 휴대폰이 **같은 함수**를 쓴다.
 *
 * ── 왜 필요한가 (2026-09-29 전체 점검 A1) ──────────────────
 * 그동안 '마지막에 본 가족', 소식 읽음 표시, 로그인 정보가 전부 `localStorage`에 있었다.
 * 그건 **브라우저에만 있는 서랍**이다. 휴대폰 앱에는 없어서 접근하면 예외가 나고,
 * 전부 메모리로 떨어져 **앱을 켤 때마다 로그인 화면**이 됐다. 웹에서만 확인해 와서 몰랐다.
 *
 * ── 구조 ───────────────────────────────────────────────
 * - 웹: `localStorage` 그대로 (동기)
 * - 휴대폰: `AsyncStorage` (비동기). 화면 코드가 `await` 없이 읽을 수 있도록,
 *   앱을 켤 때 `hydrateStorage()`로 우리 키(`familog.`로 시작)를 **메모리에 한 번 올려두고**
 *   그 뒤로는 메모리에서 읽고, 쓸 때는 메모리와 AsyncStorage 양쪽에 쓴다.
 *
 * Supabase 로그인 저장소는 비동기여도 되므로 그쪽엔 `authStorage`를 따로 준다.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureAuthStorage } from '@core/supabase';

const PREFIX = 'familog.';
const isWeb = Platform.OS === 'web';

/** 휴대폰에서 쓰는 메모리 사본. `hydrateStorage()` 뒤에만 믿을 수 있다 */
const cache = new Map<string, string>();
let hydrated = isWeb;

/** 앱을 켤 때 한 번 — 휴대폰이면 우리 키를 전부 메모리에 올린다 */
export async function hydrateStorage(): Promise<void> {
  if (isWeb || hydrated) return;
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [k, v] of pairs) if (v != null) cache.set(k, v);
  } catch {
    /* 저장소가 막혀도 앱은 켜져야 한다 — 메모리로만 간다 */
  }
  hydrated = true;
}

export function getSync(key: string): string | null {
  if (isWeb) {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  }
  return cache.get(key) ?? null;
}

export function setSync(key: string, value: string): void {
  if (isWeb) {
    try { globalThis.localStorage?.setItem(key, value); } catch { /* 없어도 된다 */ }
    return;
  }
  cache.set(key, value);
  AsyncStorage.setItem(key, value).catch(() => { /* 다음에 다시 쓴다 */ });
}

export function removeSync(key: string): void {
  if (isWeb) {
    try { globalThis.localStorage?.removeItem(key); } catch { /* 없어도 된다 */ }
    return;
  }
  cache.delete(key);
  AsyncStorage.removeItem(key).catch(() => {});
}

/**
 * Supabase 로그인 정보를 둘 곳.
 * 웹은 core의 기본값(localStorage)을 그대로 쓰고, 휴대폰은 AsyncStorage로 바꿔 끼운다.
 * 이 파일을 `app/_layout.tsx`가 맨 위에서 import하므로 첫 로그인 조회 전에 끼워진다.
 */
if (!isWeb) {
  configureAuthStorage({
    getItem: (k) => AsyncStorage.getItem(k),
    setItem: (k, v) => AsyncStorage.setItem(k, v),
    removeItem: (k) => AsyncStorage.removeItem(k),
  });
}
