import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

const CATEGORY_INFO: Record<string, { icon: string; label: string; color: string; description: string }> = {
  movies: { icon: 'film', label: '영화 관람', color: '#B8D4E6', description: '가족이 함께 본 영화를 기록하세요' },
  travel: { icon: 'plane', label: '여행 위시', color: '#FFE4C4', description: '가족 여행 위시리스트를 관리하세요' },
  recipes: { icon: 'cutlery', label: '레시피', color: '#FFDAB9', description: '가족만의 특별한 레시피를 모아보세요' },
  media: { icon: 'microphone', label: '음성/영상', color: '#D4B8E6', description: '소중한 음성과 영상을 기록하세요' },
  goals: { icon: 'trophy', label: '가족 목표', color: '#E6D4B8', description: '가족이 함께 이루는 목표를 세워보세요' },
  health: { icon: 'heartbeat', label: '건강 기록', color: '#FFB8B8', description: '가족 건강 정보를 안전하게 관리하세요' },
  'family-tree': { icon: 'sitemap', label: '가계도', color: '#C4E6B8', description: '가족의 뿌리를 기록하세요' },
  'time-capsule': { icon: 'clock-o', label: '타임캡슐', color: '#E6E4B8', description: '미래의 가족에게 메시지를 남기세요' },
  identity: { icon: 'id-card', label: 'MBTI 기록', color: '#B8C4E6', description: '가족 구성원의 성격 유형을 알아보세요' },
  legacy: { icon: 'lock', label: '디지털 유산', color: '#E6B8D4', description: '중요한 디지털 자산을 안전하게 보관하세요' },
};

export default function PlaceholderRecordScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const info = CATEGORY_INFO[type] || {
    icon: 'folder-o',
    label: type,
    color: '#EAEAEA',
    description: '곧 만나볼 수 있어요',
  };

  return (
    <>
      <Stack.Screen options={{ title: info.label }} />
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: info.color }]}>
          <FontAwesome name={info.icon as any} size={48} color="#4A4A4A" />
        </View>
        <Text style={styles.title}>{info.label}</Text>
        <Text style={styles.description}>{info.description}</Text>

        <View style={styles.badge}>
          <FontAwesome name="wrench" size={14} color="#C05A4E" />
          <Text style={styles.badgeText}>준비 중인 기능이에요</Text>
        </View>

        <Text style={styles.subtext}>
          조금만 기다려주세요!{'\n'}더 좋은 모습으로 찾아올게요.
        </Text>

        <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={14} color="#FFFFFF" />
          <Text style={styles.backButtonText}>기록 목록으로 돌아가기</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F8F5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0ED',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C05A4E',
  },
  subtext: {
    fontSize: 14,
    color: '#9C8B75',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#C05A4E',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
