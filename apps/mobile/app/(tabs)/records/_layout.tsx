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
      <Stack.Screen name="movies" options={{ title: '영화 관람' }} />
      <Stack.Screen name="travel" options={{ title: '여행 위시' }} />
      <Stack.Screen name="recipes" options={{ title: '레시피' }} />
      <Stack.Screen name="media" options={{ title: '음성/영상' }} />
      <Stack.Screen name="goals" options={{ title: '가족 목표' }} />
      <Stack.Screen name="health" options={{ title: '건강 기록' }} />
      <Stack.Screen name="family-tree" options={{ title: '가계도' }} />
      <Stack.Screen name="time-capsule" options={{ title: '타임캡슐' }} />
      <Stack.Screen name="identity" options={{ title: 'MBTI 기록' }} />
      <Stack.Screen name="legacy" options={{ title: '디지털 유산' }} />
      <Stack.Screen name="[type]" />
    </Stack>
  );
}
