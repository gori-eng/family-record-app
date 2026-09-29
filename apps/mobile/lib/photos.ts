/**
 * 사진 고르기 → 줄이기 → 창고에 올리기, 그리고 보여줄 주소 받아오기.
 *
 * ── 왜 줄이나 ──────────────────────────────────────────
 * 휴대폰 사진 한 장은 3~8MB다. 그대로 올리면 창고가 금방 차고(무료 1GB),
 * 가족이 목록을 열 때마다 큰 파일을 받느라 느려진다. 긴 쪽을 1600px로 줄이고 JPEG로 누르면
 * 보통 300~600KB가 된다. 화면에서 보기엔 충분하다.
 *
 * ── 주소는 잠깐만 ──────────────────────────────────────
 * 창고가 공개가 아니라서 사진마다 "한 시간짜리 주소"를 받아야 보인다(core/photos.ts).
 * 화면 여러 곳이 같은 사진을 보므로 받아온 주소를 여기서 모아 두고 같이 쓴다.
 * 방금 올린 사진은 올리기 전 그림을 그대로 기억해 두어 주소를 기다리지 않고 바로 보인다.
 */
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { uploadPhoto, signedPhotoUrls, deletePhotos, SIGNED_URL_TTL } from '@core/supabase';

/** 긴 쪽 최대 픽셀 */
const MAX_SIDE = 1600;
/** 한 기록에 붙일 수 있는 사진 수 */
export const MAX_PHOTOS = 6;

// ── base64 → 바이트 ──────────────────────────────────────
// 휴대폰에서는 파일 주소(file://)를 바로 올릴 수 없어서, 줄인 그림을 base64 글자로 받아 바이트로 되돌린다.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i;
  return t;
})();
export function base64ToBytes(b64: string): ArrayBuffer {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean.charCodeAt(i)];
    const b = LOOKUP[clean.charCodeAt(i + 1)];
    const c = LOOKUP[clean.charCodeAt(i + 2)];
    const d = LOOKUP[clean.charCodeAt(i + 3)];
    if (p < len) out[p++] = (a << 2) | (b >> 4);
    if (p < len) out[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < len) out[p++] = ((c & 3) << 6) | d;
  }
  return out.buffer;
}

// ── 보여줄 주소 모아두기 ──────────────────────────────────
type Entry = { url: string; exp: number };
const cache = new Map<string, Entry>();
const waiting = new Set<string>();
/** 주소를 못 받은 사진 — 잠깐 뒤(30초)에 다시 물어본다 */
const failedUntil = new Map<string, number>();
const listeners = new Set<() => void>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const fresh = (path: string) => {
  const e = cache.get(path);
  return e && e.exp > Date.now() ? e.url : null;
};

/** 한 화면에서 여러 장을 부르면 한 번에 묶어 받는다 */
function request(path: string) {
  if (fresh(path) || waiting.has(path)) return;
  if ((failedUntil.get(path) ?? 0) > Date.now()) return;
  waiting.add(path);
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    const batch = [...waiting];
    waiting.clear();
    try {
      const urls = await signedPhotoUrls(batch);
      // 만료 5분 전에 새로 받는다 — 보는 도중에 끊기지 않게
      const exp = Date.now() + (SIGNED_URL_TTL - 300) * 1000;
      for (const [p, url] of Object.entries(urls)) cache.set(p, { url, exp });
      for (const p of batch) if (!urls[p]) failedUntil.set(p, Date.now() + 30_000);
    } catch {
      // 못 받으면 '못 불러왔어요'로 보이고, 30초 뒤 다시 그려질 때 또 묻는다
      for (const p of batch) failedUntil.set(p, Date.now() + 30_000);
    }
    listeners.forEach((l) => l());
  }, 0);
}

/** 사진 한 장의 보여줄 주소. 받아오는 동안은 null, 못 받았으면 'failed' */
export function usePhotoUrl(path: string | undefined | null): string | null {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!path) return;
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    request(path);
    return () => { listeners.delete(l); };
  }, [path]);
  if (!path) return null;
  const url = fresh(path);
  if (url) return url;
  return (failedUntil.get(path) ?? 0) > Date.now() ? 'failed' : null;
}

// ── 고르고 올리기 ─────────────────────────────────────────
export type PickResult = { paths: string[]; failed: number; canceled: boolean };

/**
 * 사진을 골라(또는 찍어) 줄이고 올린다.
 * `from: 'camera'`는 휴대폰에서만 — 웹에는 카메라 화면이 없다.
 */
export async function pickAndUpload(
  familyId: string,
  opts: { from: 'library' | 'camera'; limit: number; onProgress?: (done: number, total: number) => void }
): Promise<PickResult> {
  const { from, limit } = opts;
  if (limit <= 0) return { paths: [], failed: 0, canceled: true };

  if (Platform.OS !== 'web') {
    const perm = from === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error(from === 'camera'
      ? '카메라를 쓸 수 있게 허락해주세요. 휴대폰 설정 > familog에서 바꿀 수 있어요.'
      : '사진첩을 볼 수 있게 허락해주세요. 휴대폰 설정 > familog에서 바꿀 수 있어요.');
  }

  const res = from === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: limit > 1,
        selectionLimit: limit,
        quality: 1,
      });
  if (res.canceled || !res.assets?.length) return { paths: [], failed: 0, canceled: true };

  const assets = res.assets.slice(0, limit);
  const paths: string[] = [];
  let failed = 0;
  for (const a of assets) {
    try {
      const w = a.width || 0, h = a.height || 0;
      const resize = Math.max(w, h) > MAX_SIDE
        ? [{ resize: w >= h ? { width: MAX_SIDE } : { height: MAX_SIDE } }]
        : [];
      const out = await manipulateAsync(a.uri, resize, { compress: 0.72, format: SaveFormat.JPEG, base64: true });
      if (!out.base64) throw new Error('no base64');
      const path = await uploadPhoto(familyId, base64ToBytes(out.base64));
      // 방금 올린 건 주소를 기다리지 않고 바로 보이게 — 올린 그림 그대로
      cache.set(path, { url: `data:image/jpeg;base64,${out.base64}`, exp: Number.MAX_SAFE_INTEGER });
      paths.push(path);
    } catch {
      failed += 1;
    }
    opts.onProgress?.(paths.length + failed, assets.length);
  }
  listeners.forEach((l) => l());
  return { paths, failed, canceled: false };
}

/** 정리용 — 실패해도 사용자를 막지 않는다 (못 지운 파일은 창고에 남을 뿐이다) */
export function removePhotoFiles(paths: string[] | undefined) {
  const list = (paths ?? []).filter(Boolean);
  if (!list.length) return;
  deletePhotos(list).catch(() => {});
  list.forEach((p) => cache.delete(p));
}

/** 기록 data에서 사진 경로 목록 꺼내기 — 옛 기록엔 없다 */
export const photosOf = (data: Record<string, any> | undefined): string[] =>
  Array.isArray(data?.photos) ? data!.photos.filter((p: unknown) => typeof p === 'string') : [];
