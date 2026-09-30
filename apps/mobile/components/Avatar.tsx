/**
 * 구성원 얼굴 — 설정·구성원 목록·프로필이 같이 쓴다.
 *
 * `avatar_url` 칸에는 세 가지가 들어올 수 있다.
 *   - `'photo:{창고 경로}'`  → 사진 (family-photos 창고, 2026-09-30부터)
 *   - `'🌿'` 같은 이모지    → 글자로
 *   - 비어 있음            → 이름 첫 글자(또는 아이콘)
 * 그리는 규칙을 한 곳에 두어야 세 화면이 어긋나지 않는다.
 */
import { View, Text, StyleSheet } from 'react-native';
import { PhotoImage } from './Photos';

export const PHOTO_PREFIX = 'photo:';
export const isPhotoAvatar = (v: string | null | undefined) => !!v && v.startsWith(PHOTO_PREFIX);
export const avatarPhotoPath = (v: string | null | undefined) => (isPhotoAvatar(v) ? v!.slice(PHOTO_PREFIX.length) : null);

export function Avatar({
  avatar, initial, size, bg = '#EFF6F1', color = '#4A8C6F', fallback,
}: {
  avatar: string | null | undefined;
  /** 사진도 이모지도 없을 때 보여줄 글자 (보통 이름 첫 글자) */
  initial?: string;
  size: number;
  bg?: string;
  color?: string;
  /** 글자 대신 보여줄 것 (아이콘 등) */
  fallback?: React.ReactNode;
}) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  const path = avatarPhotoPath(avatar);
  if (path) {
    return (
      <View style={[box, s.clip]}>
        <PhotoImage path={path} style={box} />
      </View>
    );
  }
  return (
    <View style={[box, s.center, { backgroundColor: bg }]}>
      {avatar
        ? <Text style={{ fontSize: size * 0.54 }}>{avatar}</Text>
        : fallback ?? <Text style={[s.initial, { fontSize: size * 0.4, color }]}>{(initial ?? '').slice(0, 1)}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  clip: { overflow: 'hidden', backgroundColor: '#EFF6F1' },
  center: { justifyContent: 'center', alignItems: 'center' },
  initial: { fontFamily: 'PretendardBold' },
});
