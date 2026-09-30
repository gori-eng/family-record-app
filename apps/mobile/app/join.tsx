/**
 * 초대 링크(`familog://join?code=XXXXXXXX`)로 들어온 사람을 알맞은 화면으로 보낸다.
 *
 *   로그인 안 함        → 로그인 화면 (코드는 잃는다 — 로그인 뒤 초대 문자를 한 번 더 누르면 된다)
 *   로그인함, 가족 없음 → 온보딩의 '초대 코드로 들어가기'에 코드가 채워진 채로
 *   로그인함, 가족 있음 → 설정의 '가족 더하기'에 코드가 채워진 채로
 *
 * 이 화면은 아무것도 그리지 않고 길만 안내한다. 가드(`lib/authGate.ts`)는 로그인한 사람이
 * 이 주소에 있는 동안 밀어내지 않는다 — 밀어내면 코드가 사라진다.
 */
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from './_layout';
import { useSession } from '../store/session';

export default function JoinScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { session, isLoading } = useAuth();
  const currentUserId = session?.user?.id ?? null;
  // "확인 끝"이 지금 로그인한 사람의 것일 때만 믿는다 (앞사람의 '가족 없음'을 읽으면 엉뚱한 곳으로 간다)
  const familyReady = useSession((s) => s.ready && !s.error && s.userId === currentUserId);
  const hasFamily = useSession((s) => !!s.family);

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace('/(auth)/login');
      return;
    }
    if (!familyReady) return;
    const params = code ? { code: String(code).trim().toUpperCase() } : {};
    if (hasFamily) router.replace({ pathname: '/settings/add-family', params } as never);
    else router.replace({ pathname: '/onboarding', params } as never);
  }, [isLoading, session, familyReady, hasFamily, code]);

  return (
    <View style={s.container}>
      <Text style={s.text}>초대받은 가족으로 가고 있어요</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5', justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 14, color: '#7A6B55', fontFamily: 'Pretendard' },
});
