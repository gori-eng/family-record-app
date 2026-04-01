import { Stack } from 'expo-router';

export default function RecordsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFDF0' },
        headerTintColor: '#2D2D2D',
        headerShadowVisible: false,
        headerBackTitle: '뒤로',
      }}
    />
  );
}
