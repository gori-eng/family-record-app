import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

function BackToIndex() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.replace('/(tabs)/records')} activeOpacity={0.7} style={{ paddingRight: 8 }}>
      <FontAwesome name="chevron-left" size={16} color="#1F1F1F" />
    </TouchableOpacity>
  );
}

export default function RecordsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#F9F8F5' },
        headerTintColor: '#1F1F1F',
        headerShadowVisible: false,
        headerBackTitle: '뒤로',
        headerTitleStyle: { fontFamily: 'PretendardBold', fontSize: 17, letterSpacing: -0.3 },
        headerLeft: () => <BackToIndex />,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, headerLeft: undefined }} />
      <Stack.Screen name="parenting" options={{ title: '육아 일기' }} />
      <Stack.Screen name="reading" options={{ title: '독서 목록' }} />
      <Stack.Screen name="finance" options={{ title: '가계부' }} />
      <Stack.Screen name="movies" options={{ title: '영화 관람' }} />
      <Stack.Screen name="travel" options={{ title: '여행 기록' }} />
      <Stack.Screen name="recipes" options={{ title: '레시피' }} />
      <Stack.Screen name="goals" options={{ title: '가족 목표' }} />
      <Stack.Screen name="health" options={{ title: '건강 기록' }} />
      <Stack.Screen name="time-capsule" options={{ title: '타임캡슐' }} />
      <Stack.Screen name="[type]" />
    </Stack>
  );
}
