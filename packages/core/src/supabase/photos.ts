/**
 * 사진 창고(Supabase Storage) 접근 계층.
 *
 * 창고 이름은 `family-photos`, 파일 경로는 `{가족 id}/{파일 이름}.jpg` (00011).
 * 첫 폴더가 곧 가족이라, DB 정책이 "우리 가족 폴더만" 보고·올리게 막는다.
 *
 * 창고는 **공개가 아니다.** 그래서 사진을 보여줄 때마다 **잠깐만 쓸 수 있는 주소(서명된 주소)**를
 * 받는다. 이 주소는 한 시간 뒤에 막힌다 — 주소가 밖으로 새도 오래 열려 있지 않다.
 * 기록에는 주소가 아니라 **경로**만 적는다(주소는 금방 만료되므로).
 */
import { supabase } from './client';

export const PHOTO_BUCKET = 'family-photos';
/** 서명된 주소가 살아 있는 시간(초) */
export const SIGNED_URL_TTL = 60 * 60;

/** 겹치지 않는 파일 이름 — 시각 + 무작위 */
const fileName = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;

/**
 * 사진 한 장 올리기. 올린 경로를 돌려준다(기록의 `data.photos`에 이 경로를 적는다).
 * `bytes`는 이미 줄이고 JPEG로 바꾼 것이어야 한다(창고는 5MB까지만 받는다).
 */
export async function uploadPhoto(familyId: string, bytes: ArrayBuffer): Promise<string> {
  const path = `${familyId}/${fileName()}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** 여러 경로의 서명된 주소를 한 번에. 못 받은 경로는 빠진다 */
export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl && !row.error) out[row.path] = row.signedUrl;
  }
  return out;
}

/**
 * 사진 지우기. 올린 사람과 관리자만 지워진다(정책) — 못 지운 건 오류 없이 남는다.
 * 기록을 지울 때 뒤따라 부르는 정리 작업이라, 실패해도 사용자를 막지 않는다(호출부가 무시해도 된다).
 */
export async function deletePhotos(paths: string[]): Promise<number> {
  if (!paths.length) return 0;
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  if (error) throw error;
  return data?.length ?? 0;
}
