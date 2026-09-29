import { Stack, useRouter, useNavigation } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

/**
 * 뒤로 — 이 기록 칸 안에 앞 화면(목록·검색)이 있으면 그리로, 없으면(홈에서 바로 왔으면) 기록 목록으로.
 * 검색 결과에서 기록을 열었다가 뒤로 가면 **검색 결과로** 돌아와야 다른 결과를 이어서 볼 수 있다.
 * `canGoBack()`은 바깥(탭)까지 따져서 true가 되므로 이 칸의 쌓인 화면 수(index)를 직접 본다.
 */
function BackToIndex() {
  const router = useRouter();
  const navigation = useNavigation();
  const onPress = () => {
    const state = navigation.getState();
    if (state && state.index > 0) navigation.goBack();
    else router.replace('/(tabs)/records');
  };
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ paddingRight: 8 }}>
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
        headerTitleStyle: { fontFamily: 'PretendardBold', fontSize: 17 },
        headerLeft: () => <BackToIndex />,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, headerLeft: undefined }} />
      <Stack.Screen name="parenting" options={{ title: '육아 일기' }} />
      <Stack.Screen name="reading" options={{ title: '독서 목록' }} />
      <Stack.Screen name="finance" options={{ title: '가계부' }} />
      <Stack.Screen name="finance-import" options={{ title: '명세서 가져오기' }} />
      <Stack.Screen name="movies" options={{ title: '영화 관람' }} />
      <Stack.Screen name="travel" options={{ title: '여행 기록' }} />
      <Stack.Screen name="recipes" options={{ title: '레시피' }} />
      <Stack.Screen name="goals" options={{ title: '가족 목표' }} />
      <Stack.Screen name="health" options={{ title: '건강 기록' }} />
      <Stack.Screen name="time-capsule" options={{ title: '타임캡슐' }} />
      <Stack.Screen name="search" options={{ title: '기록 찾기' }} />
    </Stack>
  );
}
