import { Stack } from 'expo-router';

export default function RecordsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFDF0' },
        headerTintColor: '#2D2D2D',
        headerShadowVisible: false,
        headerBackTitle: '뒤로',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="parenting" options={{ title: '육아 일기' }} />
      <Stack.Screen name="reading" options={{ title: '독서 목록' }} />
      <Stack.Screen name="finance" options={{ title: '가계부' }} />
      <Stack.Screen name="[type]" />
    </Stack>
  );
}
