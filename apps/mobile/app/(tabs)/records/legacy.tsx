import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const SUBSCRIPTIONS = [
  { name: 'Netflix', cost: '17,000원/월', icon: 'tv', color: '#E53935' },
  { name: 'Spotify', cost: '10,900원/월', icon: 'music', color: '#1DB954' },
  { name: 'iCloud 200GB', cost: '3,900원/월', icon: 'cloud', color: '#007AFF' },
  { name: 'YouTube Premium', cost: '14,900원/월', icon: 'youtube-play', color: '#FF0000' },
];

const MESSAGES = [
  { recipient: '서준에게', trigger: '사후 공개', sealed: '2026.1.1', icon: 'envelope', color: '#B0C8D8' },
  { recipient: '지우에게', trigger: '성인식', sealed: '2025.6.15', icon: 'heart', color: '#F0B8B8' },
  { recipient: '가족 전체에게', trigger: '사후 공개', sealed: '2026.3.1', icon: 'users', color: '#E8D0C0' },
];

export default function LegacyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '디지털 유산' }} />
      <View style={s.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.intro}>
            <FontAwesome name="shield" size={18} color="#4AA86B" />
            <View style={s.introContent}>
              <Text style={s.introTitle}>디지털 자산을 안전하게 관리하세요</Text>
              <Text style={s.introDesc}>구독 서비스, 중요 계정, 마지막 편지를 기록합니다. 사후 공개 옵션으로 가족에게 전달할 수 있습니다.</Text>
            </View>
          </View>

          {/* Subscriptions */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>구독 서비스 관리</Text>
            <Text style={s.sectionSubtitle}>월 총 46,700원</Text>
            {SUBSCRIPTIONS.map((sub, i) => (
              <TouchableOpacity key={i} style={s.subCard} activeOpacity={0.7}
                onPress={() => Alert.alert(sub.name, `비용: ${sub.cost}\n\n이 구독 정보는 가족에게 공유됩니다.`)}>
                <View style={[s.subIcon, { backgroundColor: sub.color }]}>
                  <FontAwesome name={sub.icon as any} size={16} color="#FFFFFF" />
                </View>
                <Text style={s.subName}>{sub.name}</Text>
                <Text style={s.subCost}>{sub.cost}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Last Messages */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>마지막 편지</Text>
            <Text style={s.sectionSubtitle}>사후 공개 설정으로 가족에게 전달됩니다</Text>
            {MESSAGES.map((msg, i) => (
              <TouchableOpacity key={i} style={s.msgCard} activeOpacity={0.7}
                onPress={() => Alert.alert('마지막 편지', `수신: ${msg.recipient}\n공개 조건: ${msg.trigger}\n밀봉일: ${msg.sealed}\n\n내용은 비공개입니다.`)}>
                <View style={[s.msgIcon, { backgroundColor: msg.color }]}>
                  <FontAwesome name={msg.icon as any} size={16} color="#5C4A32" />
                </View>
                <View style={s.msgInfo}>
                  <Text style={s.msgRecipient}>{msg.recipient}</Text>
                  <Text style={s.msgTrigger}>{msg.trigger} · 밀봉: {msg.sealed}</Text>
                </View>
                <FontAwesome name="lock" size={14} color="#C05A4E" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Important Note */}
          <View style={s.warning}>
            <FontAwesome name="info-circle" size={14} color="#7A6B55" />
            <Text style={s.warningText}>이 섹션의 정보는 암호화되어 저장되며, 설정한 조건이 충족될 때만 지정된 가족에게 공개됩니다.</Text>
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
        <TouchableOpacity style={s.fab} activeOpacity={0.8} onPress={() => Alert.alert('디지털 유산', '새 항목 추가 기능이 곧 추가됩니다.')}>
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, margin: 20, backgroundColor: '#E8F5E9', borderRadius: 16, padding: 18 },
  introContent: { flex: 1 },
  introTitle: { fontSize: 15, fontWeight: '700', color: '#2E7D32', marginBottom: 4 },
  introDesc: { fontSize: 12, color: '#2E7D32', lineHeight: 18 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F1F1F', marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, color: '#9C8B75', marginBottom: 12 },
  subCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EAEAEA' },
  subIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  subName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1F1F1F' },
  subCost: { fontSize: 13, color: '#C05A4E', fontWeight: '600' },
  msgCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EAEAEA' },
  msgIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  msgInfo: { flex: 1 },
  msgRecipient: { fontSize: 15, fontWeight: '600', color: '#1F1F1F', marginBottom: 2 },
  msgTrigger: { fontSize: 12, color: '#9C8B75' },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, backgroundColor: '#F5F0E5', borderRadius: 12, padding: 14 },
  warningText: { flex: 1, fontSize: 12, color: '#7A6B55', lineHeight: 18 },
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C05A4E', justifyContent: 'center', alignItems: 'center', shadowColor: '#C05A4E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
