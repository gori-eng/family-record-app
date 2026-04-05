import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFDF0' },
        headerTintColor: '#2D2D2D',
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
