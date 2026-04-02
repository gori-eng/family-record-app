import { Stack, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: '', headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <FontAwesome name="map-signs" size={40} color="#C85A4A" />
        </View>
        <Text style={styles.title}>페이지를 찾을 수 없어요</Text>
        <Text style={styles.subtitle}>요청하신 페이지가 존재하지 않거나{'\n'}이동되었을 수 있어요.</Text>

        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)')}>
          <FontAwesome name="home" size={16} color="#FFFFFF" />
          <Text style={styles.buttonText}>홈으로 돌아가기</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#FFFDF0',
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF0ED', justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#2D2D2D', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#8B7355', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#C85A4A', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12,
  },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
