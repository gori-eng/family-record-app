import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const MEDIA = [
  { type: 'voice', title: '지우 첫 "엄마" 발음', date: '2024.6.15', duration: '0:12', occasion: '일상', icon: 'microphone', color: '#CE93D8', member: '지우' },
  { type: 'video', title: '서준이 피아노 발표회', date: '2026.3.10', duration: '4:32', occasion: '발표회', icon: 'video-camera', color: '#4FC3F7', member: '서준' },
  { type: 'voice', title: '할머니 생신 축하 노래', date: '2025.9.20', duration: '1:45', occasion: '생일', icon: 'microphone', color: '#FFB74D', member: '전체' },
  { type: 'video', title: '가족 크리스마스 영상편지', date: '2025.12.25', duration: '3:18', occasion: '크리스마스', icon: 'video-camera', color: '#E57373', member: '전체' },
  { type: 'voice', title: '아빠가 읽어주는 동화', date: '2026.2.14', duration: '8:22', occasion: '잠자리', icon: 'microphone', color: '#81C784', member: '민준' },
];

export default function MediaScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '음성/영상' }} />
      <View style={s.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.intro}>
            <FontAwesome name="headphones" size={20} color="#C05A4E" />
            <Text style={s.introText}>가족의 목소리와 영상을 기록하세요. 텍스트보다 훨씬 더 강력한 기억이 됩니다.</Text>
          </View>

          <View style={s.statsRow}>
            <View style={s.stat}><FontAwesome name="microphone" size={16} color="#CE93D8" /><Text style={s.statNum}>3</Text><Text style={s.statLabel}>음성</Text></View>
            <View style={s.stat}><FontAwesome name="video-camera" size={16} color="#4FC3F7" /><Text style={s.statNum}>2</Text><Text style={s.statLabel}>영상</Text></View>
            <View style={s.stat}><FontAwesome name="clock-o" size={16} color="#FFB74D" /><Text style={s.statNum}>18분</Text><Text style={s.statLabel}>총 시간</Text></View>
          </View>

          <View style={s.list}>
            {MEDIA.map((m, i) => (
              <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                onPress={() => Alert.alert(m.title, `유형: ${m.type === 'voice' ? '음성' : '영상'}\n날짜: ${m.date}\n길이: ${m.duration}\n계기: ${m.occasion}\n기록자: ${m.member}`)}>
                <View style={[s.mediaIcon, { backgroundColor: m.color }]}>
                  <FontAwesome name={m.icon as any} size={18} color="#FFFFFF" />
                </View>
                <View style={s.info}>
                  <Text style={s.title}>{m.title}</Text>
                  <Text style={s.meta}>{m.date} · {m.duration} · {m.occasion}</Text>
                  <View style={s.memberRow}>
                    <FontAwesome name="user" size={10} color="#9C8B75" />
                    <Text style={s.member}>{m.member}</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.playBtn} activeOpacity={0.7}>
                  <FontAwesome name="play" size={14} color="#C05A4E" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
        <TouchableOpacity style={s.fab} activeOpacity={0.8} onPress={() => Alert.alert('녹음/촬영', '음성/영상 기록 기능이 곧 추가됩니다.')}>
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, margin: 20, backgroundColor: '#FFF0ED', borderRadius: 14, padding: 16 },
  introText: { flex: 1, fontSize: 13, color: '#C05A4E', lineHeight: 20, fontFamily: 'Pretendard' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 20, fontWeight: '700', color: '#1F1F1F', marginTop: 4, fontFamily: 'PretendardBold' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'Pretendard' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  mediaIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#1F1F1F', marginBottom: 2, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  meta: { fontSize: 12, color: '#A0A0A0', marginBottom: 4, fontFamily: 'Pretendard' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  member: { fontSize: 11, color: '#7A6B55' },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0ED', justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C05A4E', justifyContent: 'center', alignItems: 'center', shadowColor: '#C05A4E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
