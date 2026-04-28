import { View, Text, Switch, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';

export default function PrivacyScreen() {
  const [hideFinance, setHideFinance] = useState(true);
  const [hideHealth, setHideHealth] = useState(true);
  const [shareReading, setShareReading] = useState(true);

  return (
    <>
      <Stack.Screen options={{ title: '개인정보 보호' }} />
      <ScrollView style={s.container}>
        <View style={s.infoBox}>
          <FontAwesome name="shield" size={16} color="#4AA86B" />
          <Text style={s.infoText}>가족 내에서도 민감한 정보는 역할에 따라 접근이 제한됩니다.</Text>
        </View>

        <Text style={s.sectionTitle}>데이터 공개 범위</Text>
        <View style={s.row}>
          <View style={s.info}>
            <Text style={s.label}>가계부 자녀에게 숨기기</Text>
            <Text style={s.desc}>자녀 계정에서 가계부 데이터를 볼 수 없음</Text>
          </View>
          <Switch value={hideFinance} onValueChange={setHideFinance}
            trackColor={{ false: '#E8E0D0', true: '#F5C0B0' }} thumbColor={hideFinance ? '#C85A4A' : '#BFAE99'} />
        </View>
        <View style={s.row}>
          <View style={s.info}>
            <Text style={s.label}>건강 기록 부/모만 열람</Text>
            <Text style={s.desc}>건강 기록은 부/모 역할만 열람 가능</Text>
          </View>
          <Switch value={hideHealth} onValueChange={setHideHealth}
            trackColor={{ false: '#E8E0D0', true: '#F5C0B0' }} thumbColor={hideHealth ? '#C85A4A' : '#BFAE99'} />
        </View>
        <View style={s.row}>
          <View style={s.info}>
            <Text style={s.label}>독서/영화 기록 공유</Text>
            <Text style={s.desc}>모든 가족이 독서/영화 기록을 볼 수 있음</Text>
          </View>
          <Switch value={shareReading} onValueChange={setShareReading}
            trackColor={{ false: '#E8E0D0', true: '#F5C0B0' }} thumbColor={shareReading ? '#C85A4A' : '#BFAE99'} />
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0', padding: 20 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginBottom: 24 },
  infoText: { flex: 1, fontSize: 13, color: '#2E7D32', lineHeight: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9C8B75', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#F0E8D8' },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: '#2D2D2D' },
  desc: { fontSize: 12, color: '#9C8B75', marginTop: 2 },
});
