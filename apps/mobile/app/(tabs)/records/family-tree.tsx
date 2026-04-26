import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const GENERATIONS = [
  {
    gen: '1세대 (조부모)',
    members: [
      { name: '김영수', relation: '할아버지', birth: '1945', color: '#B0C8D8', alive: false },
      { name: '이순자', relation: '할머니', birth: '1948', color: '#E8D0C0', alive: true },
    ],
  },
  {
    gen: '2세대 (부모)',
    members: [
      { name: '김민준', relation: '아빠', birth: '1990', color: '#B0C8D8', alive: true },
      { name: '박지수', relation: '엄마', birth: '1992', color: '#E8D0C0', alive: true },
    ],
  },
  {
    gen: '3세대 (자녀)',
    members: [
      { name: '김서준', relation: '아들', birth: '2018', color: '#B8D8C0', alive: true },
      { name: '김지우', relation: '딸', birth: '2022', color: '#F0B8B8', alive: true },
    ],
  },
];

export default function FamilyTreeScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '가계도' }} />
      <View style={s.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.intro}>
            <FontAwesome name="sitemap" size={18} color="#C05A4E" />
            <Text style={s.introText}>우리 가족의 뿌리를 기록하세요. 각 인물을 탭하면 인생 요약, 독서 리스트, 건강 기록을 볼 수 있습니다.</Text>
          </View>

          {GENERATIONS.map((gen, gi) => (
            <View key={gi} style={s.genSection}>
              <Text style={s.genTitle}>{gen.gen}</Text>
              <View style={s.genLine} />
              <View style={s.membersRow}>
                {gen.members.map((m, mi) => (
                  <TouchableOpacity key={mi} style={s.memberCard} activeOpacity={0.7}
                    onPress={() => Alert.alert(m.name, `관계: ${m.relation}\n출생: ${m.birth}년\n상태: ${m.alive ? '생존' : '작고'}\n\n인물 상세 페이지가 곧 추가됩니다.`)}>
                    <View style={[s.avatar, { backgroundColor: m.color, opacity: m.alive ? 1 : 0.5 }]}>
                      <Text style={s.avatarText}>{m.name[1]}</Text>
                    </View>
                    <Text style={s.memberName}>{m.name}</Text>
                    <Text style={s.memberRelation}>{m.relation}</Text>
                    <Text style={s.memberBirth}>{m.birth}년생</Text>
                    {!m.alive && <Text style={s.deceased}>작고</Text>}
                  </TouchableOpacity>
                ))}
              </View>
              {gi < GENERATIONS.length - 1 && (
                <View style={s.connector}>
                  <View style={s.connectorLine} />
                  <FontAwesome name="chevron-down" size={12} color="#D4C8B0" />
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={s.addMember} activeOpacity={0.7}
            onPress={() => Alert.alert('구성원 추가', '가계도에 새 구성원을 추가하는 기능이 곧 추가됩니다.')}>
            <FontAwesome name="plus-circle" size={18} color="#C05A4E" />
            <Text style={s.addText}>구성원 추가하기</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, margin: 20, backgroundColor: '#FFF0ED', borderRadius: 14, padding: 16 },
  introText: { flex: 1, fontSize: 13, color: '#C05A4E', lineHeight: 20, fontFamily: 'Pretendard' },
  genSection: { paddingHorizontal: 20, marginBottom: 16 },
  genTitle: { fontSize: 14, fontWeight: '700', color: '#A0A0A0', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'PretendardBold' },
  genLine: { height: 1, backgroundColor: '#EAEAEA', marginBottom: 16 },
  membersRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  memberCard: { alignItems: 'center', width: 100, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#5C4A32' },
  memberName: { fontSize: 14, fontWeight: '700', color: '#1F1F1F', marginBottom: 2, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  memberRelation: { fontSize: 12, color: '#888', marginBottom: 2, fontFamily: 'Pretendard' },
  memberBirth: { fontSize: 11, color: '#A0A0A0', fontFamily: 'Pretendard' },
  deceased: { fontSize: 10, color: '#C05A4E', fontWeight: '600', marginTop: 4 },
  connector: { alignItems: 'center', paddingVertical: 12 },
  connectorLine: { width: 2, height: 20, backgroundColor: '#EAEAEA' },
  addMember: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, marginHorizontal: 20 },
  addText: { fontSize: 15, fontWeight: '600', color: '#C05A4E', fontFamily: 'Pretendard' },
});
