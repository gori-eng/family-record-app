import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#F9F8F5' },
        headerTintColor: '#1F1F1F',
        headerTitleStyle: { fontFamily: 'PretendardBold', fontSize: 17, letterSpacing: -0.3 },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
