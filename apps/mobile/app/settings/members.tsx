import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const MEMBERS = [
  { name: '김지수', role: '관리자', color: '#FFDAB9', email: 'jisoo@family.com' },
  { name: '김민준', role: '부모', color: '#B8D4E6', email: 'minjun@family.com' },
  { name: '김지우', role: '자녀', color: '#FFB6C1', email: '' },
  { name: '김서준', role: '자녀', color: '#B8E6C8', email: 'seojun@family.com' },
];

export default function MembersScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '가족 구성원' }} />
      <ScrollView style={s.container}>
        <Text style={s.subtitle}>가족 구성원 {MEMBERS.length}명</Text>
        {MEMBERS.map((m, i) => (
          <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
            onPress={() => Alert.alert(m.name, `역할: ${m.role}\n이메일: ${m.email || '미등록'}\n\n역할 변경 및 프로필 수정 기능이 곧 추가됩니다.`)}>
            <View style={[s.avatar, { backgroundColor: m.color }]}>
              <Text style={s.initial}>{m.name[1]}</Text>
            </View>
            <View style={s.info}>
              <Text style={s.name}>{m.name}</Text>
              <Text style={s.role}>{m.role}{m.email ? ` · ${m.email}` : ''}</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.addBtn} activeOpacity={0.7}
          onPress={() => Alert.alert('가족 초대', '초대 코드: ABC12345\n\n이 코드를 공유하여 가족을 초대하세요.')}>
          <FontAwesome name="plus-circle" size={20} color="#C85A4A" />
          <Text style={s.addText}>새 가족 구성원 초대</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0', padding: 20 },
  subtitle: { fontSize: 14, color: '#9C8B75', marginBottom: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#F0E8D8' },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  initial: { fontSize: 18, fontWeight: '700', color: '#5C4A32' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#2D2D2D' },
  role: { fontSize: 12, color: '#9C8B75', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, marginTop: 8 },
  addText: { fontSize: 15, fontWeight: '600', color: '#C85A4A' },
});
