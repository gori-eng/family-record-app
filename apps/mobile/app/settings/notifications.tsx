import { View, Text, Switch, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useState } from 'react';

export default function NotificationsScreen() {
  const [schedule, setSchedule] = useState(true);
  const [records, setRecords] = useState(true);
  const [finance, setFinance] = useState(false);
  const [aiQuestion, setAiQuestion] = useState(true);
  const [familyActivity, setFamilyActivity] = useState(true);

  const items = [
    { label: '일정 알림', desc: '일정 시작 30분 전 알림', value: schedule, onToggle: setSchedule },
    { label: '기록 업데이트', desc: '가족이 새 기록을 추가하면 알림', value: records, onToggle: setRecords },
    { label: '가계부 알림', desc: '월말 정산, 예산 초과 시 알림', value: finance, onToggle: setFinance },
    { label: 'AI 오늘의 질문', desc: '매일 아침 가족 질문 알림', value: aiQuestion, onToggle: setAiQuestion },
    { label: '가족 활동', desc: '가족 목표 달성, 마일스톤 알림', value: familyActivity, onToggle: setFamilyActivity },
  ];

  return (
    <>
      <Stack.Screen options={{ title: '알림 설정' }} />
      <ScrollView style={s.container}>
        <Text style={s.subtitle}>받고 싶은 알림을 선택하세요</Text>
        {items.map((item, i) => (
          <View key={i} style={s.row}>
            <View style={s.info}>
              <Text style={s.label}>{item.label}</Text>
              <Text style={s.desc}>{item.desc}</Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ false: '#E8E0D0', true: '#F5C0B0' }}
              thumbColor={item.value ? '#C85A4A' : '#BFAE99'}
            />
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0', padding: 20 },
  subtitle: { fontSize: 14, color: '#9C8B75', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#F0E8D8' },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: '#2D2D2D' },
  desc: { fontSize: 12, color: '#9C8B75', marginTop: 2 },
});
