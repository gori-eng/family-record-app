import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

export default function ExportScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '데이터 내보내기' }} />
      <ScrollView style={s.container}>
        <Text style={s.subtitle}>가족 기록을 안전하게 백업하세요</Text>

        <TouchableOpacity style={s.card} activeOpacity={0.7}
          onPress={() => Alert.alert('PDF 내보내기', '전체 기록을 PDF 파일로 내보냅니다.\n\n이 기능은 곧 추가됩니다.')}>
          <View style={[s.icon, { backgroundColor: '#FFB8B8' }]}>
            <FontAwesome name="file-pdf-o" size={22} color="#C62828" />
          </View>
          <View style={s.info}>
            <Text style={s.cardTitle}>PDF 내보내기</Text>
            <Text style={s.cardDesc}>전체 기록을 보기 좋은 PDF 문서로 내보냅니다</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
        </TouchableOpacity>

        <TouchableOpacity style={s.card} activeOpacity={0.7}
          onPress={() => Alert.alert('JSON 내보내기', '전체 데이터를 JSON 형식으로 내보냅니다.\n\n이 기능은 곧 추가됩니다.')}>
          <View style={[s.icon, { backgroundColor: '#B8D4E6' }]}>
            <FontAwesome name="code" size={22} color="#1565C0" />
          </View>
          <View style={s.info}>
            <Text style={s.cardTitle}>JSON 백업</Text>
            <Text style={s.cardDesc}>데이터를 JSON 형식으로 백업하여 다른 기기에서 복원 가능</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
        </TouchableOpacity>

        <TouchableOpacity style={s.card} activeOpacity={0.7}
          onPress={() => Alert.alert('사진/영상 백업', '모든 사진과 영상을 압축하여 다운로드합니다.\n\n이 기능은 곧 추가됩니다.')}>
          <View style={[s.icon, { backgroundColor: '#B8E6C8' }]}>
            <FontAwesome name="photo" size={22} color="#2E7D32" />
          </View>
          <View style={s.info}>
            <Text style={s.cardTitle}>사진/영상 백업</Text>
            <Text style={s.cardDesc}>기록에 포함된 모든 미디어 파일을 한번에 백업</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
        </TouchableOpacity>

        <View style={s.infoBox}>
          <FontAwesome name="info-circle" size={14} color="#7A6B55" />
          <Text style={s.infoText}>내보낸 데이터는 특정 OS에 종속되지 않는 표준 형식으로 저장됩니다.</Text>
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0', padding: 20 },
  subtitle: { fontSize: 14, color: '#9C8B75', marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F0E8D8' },
  icon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#2D2D2D' },
  cardDesc: { fontSize: 12, color: '#7A6B55', marginTop: 2, lineHeight: 18 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F5F0E5', borderRadius: 12, padding: 14, marginTop: 16 },
  infoText: { flex: 1, fontSize: 12, color: '#7A6B55', lineHeight: 18 },
});
