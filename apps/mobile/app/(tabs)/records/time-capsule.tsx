import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const CAPSULES = [
  { title: '서준이 성인식에 열어보세요', target: '2036.5.15', type: '성인식', author: '지수, 민준', sealed: '2026.3.1', locked: true, icon: 'gift', color: '#CE93D8' },
  { title: '지우에게 보내는 첫 편지', target: '2032.1.1', type: '생일', author: '지수', sealed: '2023.6.15', locked: true, icon: 'envelope', color: '#4FC3F7' },
  { title: '2025년 가족 영상 편지', target: '2030.12.31', type: '연말', author: '전체', sealed: '2025.12.31', locked: true, icon: 'video-camera', color: '#FFB74D' },
  { title: '우리 첫 집 기억', target: '2026.4.1', type: '기념일', author: '지수, 민준', sealed: '2024.4.1', locked: false, icon: 'home', color: '#81C784' },
];

export default function TimeCapsuleScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '타임캡슐' }} />
      <View style={s.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.intro}>
            <FontAwesome name="clock-o" size={20} color="#C85A4A" />
            <View style={s.introContent}>
              <Text style={s.introTitle}>미래의 가족에게 메시지를 남기세요</Text>
              <Text style={s.introDesc}>특정 날짜나 조건이 되면 자동으로 공개됩니다</Text>
            </View>
          </View>

          <View style={s.list}>
            {CAPSULES.map((c, i) => (
              <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                onPress={() => {
                  if (c.locked) {
                    Alert.alert('잠긴 타임캡슐', `이 캡슐은 ${c.target}에 열 수 있습니다.\n\n밀봉일: ${c.sealed}\n작성자: ${c.author}\n유형: ${c.type}`);
                  } else {
                    Alert.alert('열린 타임캡슐! 🎉', `${c.title}\n\n밀봉일: ${c.sealed}\n작성자: ${c.author}\n\n내용 보기 기능이 곧 추가됩니다.`);
                  }
                }}>
                <View style={[s.capsuleIcon, { backgroundColor: c.color }]}>
                  <FontAwesome name={c.icon as any} size={20} color="#FFFFFF" />
                </View>
                <View style={s.info}>
                  <Text style={s.capsuleTitle}>{c.title}</Text>
                  <Text style={s.capsuleType}>{c.type} · {c.author}</Text>
                  <View style={s.dateRow}>
                    <FontAwesome name={c.locked ? 'lock' : 'unlock'} size={11} color={c.locked ? '#C85A4A' : '#4AA86B'} />
                    <Text style={[s.dateText, { color: c.locked ? '#C85A4A' : '#4AA86B' }]}>
                      {c.locked ? `${c.target} 개봉 예정` : '개봉 완료!'}
                    </Text>
                  </View>
                </View>
                {!c.locked && <FontAwesome name="envelope-open" size={16} color="#4AA86B" />}
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
        <TouchableOpacity style={s.fab} activeOpacity={0.8} onPress={() => Alert.alert('타임캡슐 만들기', '새 타임캡슐 작성 기능이 곧 추가됩니다.')}>
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, margin: 20, backgroundColor: '#FFF8F0', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#F5E8D8' },
  introContent: { flex: 1 },
  introTitle: { fontSize: 15, fontWeight: '700', color: '#2D2D2D', marginBottom: 4 },
  introDesc: { fontSize: 12, color: '#7A6B55' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F0E8D8' },
  capsuleIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  capsuleTitle: { fontSize: 15, fontWeight: '700', color: '#2D2D2D', marginBottom: 2 },
  capsuleType: { fontSize: 12, color: '#9C8B75', marginBottom: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C85A4A', justifyContent: 'center', alignItems: 'center', shadowColor: '#C85A4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
