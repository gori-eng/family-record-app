import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const STEPS = [
  { icon: 'users', title: '가족을 초대하세요', desc: '초대 코드를 공유하여 가족 구성원을 추가하세요' },
  { icon: 'book', title: '기록을 시작하세요', desc: '육아 일기, 독서, 가계부 등 다양한 기록을 남겨보세요' },
  { icon: 'magic', title: 'AI 비서와 함께', desc: 'AI 비서가 기록을 분석하고 질문으로 추억을 되살려줘요' },
];

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>우리 가족에 오신 것을 환영해요!</Text>

      <View style={styles.stepsContainer}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <FontAwesome name={step.icon as any} size={20} color="#C05A4E" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.startButton}
        activeOpacity={0.8}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.startButtonText}>시작하기</Text>
        <FontAwesome name="arrow-right" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#F9F8F5',
    justifyContent: 'center', paddingHorizontal: 32,
  },
  welcome: {
    fontSize: 26, fontWeight: '700', color: '#C05A4E',
    textAlign: 'center', marginBottom: 48,
  },
  stepsContainer: { gap: 24, marginBottom: 48 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFDAB9', justifyContent: 'center', alignItems: 'center',
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 4 },
  stepDesc: { fontSize: 13, color: '#888888', lineHeight: 20 },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#C05A4E', borderRadius: 12,
    paddingVertical: 16, alignSelf: 'stretch',
  },
  startButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
