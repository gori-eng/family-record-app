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
    Cafe24Ssurround: require('../assets/fonts/Cafe24Ssurround.ttf'),
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
        </ThemeProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

function RootLayoutNav() {
  const { session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // TODO: 실제 Supabase 연결 후 아래 주석 해제
  // useEffect(() => {
  //   const inAuthGroup = segments[0] === '(auth)';
  //   if (!session && !inAuthGroup) {
  //     router.replace('/(auth)/login');
  //   } else if (session && inAuthGroup) {
  //     router.replace('/(tabs)');
  //   }
  // }, [session, segments]);

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
