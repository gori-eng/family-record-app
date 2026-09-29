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
import { useRecordsStore } from '../store/records';
import { useEventsStore } from '../store/events';
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
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
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
    // Check initial session
    getSession().then((s) => {
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
  const familyReady = useSession((s) => s.ready);
  const hasFamily = useSession((s) => !!s.family);

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
    } else {
      clearRecords();
      clearEvents();
    }
  }, [familyId, session?.user?.id]);

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFDF0" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
