import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, createContext, useContext } from 'react';
import { onAuthStateChange, getSession } from '@core/supabase';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'react-native';
import 'react-native-reanimated';
import { AlertHost } from '../components/AppAlert';
// ⚠️ 맨 먼저 — 휴대폰용 로그인 저장소를 끼워 넣는다 (lib/storage.ts 참조)
import { hydrateStorage } from '../lib/storage';
import { useRecordsStore } from '../store/records';
import { useEventsStore } from '../store/events';
import { usePlacesStore } from '../store/places';
import { attachFinanceSettings, detachFinanceSettings } from '../store/financeSettings';
import { useSession } from '../store/session';
import { decideRoute, whereFrom, REQUIRE_AUTH } from '../lib/authGate';

export { ErrorBoundary } from 'expo-router';

const queryClient = new QueryClient();

// 톤 다운된 팔레트 — 자연스럽고 세련된 따스함
const FamilyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4A8C6F',
    background: '#F9F8F5',
    card: '#FFFFFF',
    text: '#1F1F1F',
    border: '#EAEAEA',
    notification: '#4A8C6F',
  },
};

// Auth context
type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Pretendard: require('../assets/fonts/Pretendard-Regular.otf'),
    PretendardBold: require('../assets/fonts/Pretendard-Bold.otf'),
    GaeguBold: require('../assets/fonts/GaeguBold.ttf'),
    ...FontAwesome.font,
  });
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    // 휴대폰 서랍(AsyncStorage)을 메모리에 올린 **뒤에** 로그인 정보를 읽는다.
    // 순서가 바뀌면 '마지막에 본 가족' 같은 값이 아직 없는 채로 판단한다
    hydrateStorage()
      .then(() => getSession())
      .then((s) => {
        setSession(s);
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isLoading]);

  if (!loaded || isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={FamilyTheme}>
          <RootLayoutNav />
          {/* RN의 기본 알림창은 웹에서 무음이라 공용 알림창을 여기 한 번 올려둔다 */}
          <AlertHost />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const setUserId = useSession((s) => s.setUserId);
  const refresh = useSession((s) => s.refresh);
  const clear = useSession((s) => s.clear);
  /**
   * ⚠️ 조회에 **실패한 것**을 "가족이 없다"로 읽으면 안 된다.
   *    인터넷이 잠깐 끊긴 채 앱을 열면 가족 조회가 실패한다. 그걸 "가족 없음"으로 보면
   *    가드가 온보딩으로 보내고, 모르고 가족을 또 만들면 **가족이 둘로 쪼개진다.**
   *    그래서 실패했을 때는 "아직 모른다"로 두고(가드가 기다린다) 잠시 뒤 다시 묻는다.
   */
  // "확인 끝"이 **지금 로그인한 사람의** 확인이어야 한다 — 앞사람(로그아웃 상태)의 "가족 없음"을
  // 새 사람 것으로 읽으면 로그인 직후 온보딩이 1초 번쩍인다 (2026-09-30)
  const currentUserId = session?.user?.id ?? null;
  const familyReady = useSession((s) => s.ready && !s.error && s.userId === currentUserId);
  const hasFamily = useSession((s) => !!s.family);
  const sessionError = useSession((s) => s.error);
  useEffect(() => {
    if (!sessionError || !session?.user?.id) return;
    const t = setTimeout(() => refresh(), 3000);
    return () => clearTimeout(t);
  }, [sessionError, session?.user?.id]);

  /**
   * 로그인한 사람이 바뀌면 그 사람의 가족·구성원을 다시 불러온다.
   * 이 일을 화면마다 하지 않고 여기 한 번만 두는 이유: 가족 정보는
   * 홈·기록·가계부가 모두 쓰는 값이라 들어오는 문 하나에서 챙기는 게 맞다.
   */
  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (!userId) {
      clear();
      return;
    }
    setUserId(userId);
    refresh();
  }, [session?.user?.id]);

  /**
   * 가족이 정해지면 그 가족의 기록을 불러온다.
   * 가족이 없어지면(로그아웃) 비운다 — 남겨두면 다음 사람에게 남의 기록이 보인다.
   */
  const familyId = useSession((s) => s.family?.id ?? null);
  const loadRecords = useRecordsStore((s) => s.load);
  const clearRecords = useRecordsStore((s) => s.clear);
  const loadEvents = useEventsStore((s) => s.load);
  const clearEvents = useEventsStore((s) => s.clear);
  useEffect(() => {
    const userId = session?.user?.id;
    if (familyId && userId) {
      loadRecords(familyId, userId);
      loadEvents(familyId, userId);
      usePlacesStore.getState().load(familyId);
    } else {
      clearRecords();
      clearEvents();
      usePlacesStore.getState().clear();
    }
  }, [familyId, session?.user?.id]);

  /**
   * 가계부 설정은 **어른일 때만** 가족 것에 연결한다 (00010 — 돈 이야기는 어른만).
   * 아이 계정이 연결하면 DB가 거절하는데, 처음 연결 때 이 기기 설정을 올리려다 오류가 난다.
   * 역할은 구성원을 불러온 뒤에야 알 수 있어서 따로 본다.
   */
  const myRole = useSession((s) => s.me?.role ?? null);
  const grownup = myRole === 'admin' || myRole === 'parent' || myRole === 'elder';
  useEffect(() => {
    if (!familyId) { detachFinanceSettings(); return; }
    // ⚠️ 가족을 바꾸는 사이엔 역할이 잠깐 '모름'(null)이 된다. 그때 떼었다 붙이면
    //    '처음 연결'로 착각해 이 기기의 옛 설정을 새 가족에 올린다 → 모를 땐 그대로 둔다
    if (!myRole) return;
    if (grownup) attachFinanceSettings(familyId);
    else detachFinanceSettings();
  }, [familyId, myRole]);

  // 길 안내 — 무엇을 어디로 보낼지는 lib/authGate.ts가 정한다 (Node에서 검증됨)
  useEffect(() => {
    const to = decideRoute({
      authReady: !isLoading,
      signedIn: !!session,
      familyReady,
      hasFamily,
      where: whereFrom(segments as string[]),
    });
    if (to) router.replace(to as never);
  }, [isLoading, session, familyReady, hasFamily, segments]);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F8F5" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
