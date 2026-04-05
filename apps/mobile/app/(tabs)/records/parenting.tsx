import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';

const ENTRIES = [
  {
    date: '2026년 4월 1일', child: '지우',
    title: '첫 자전거 타기 성공!',
    content: '드디어 보조바퀴 없이 자전거를 탔어요. 처음엔 무서워서 울다가, 아빠가 잡아주면서 연습했더니 혼자서도 잘 타요!',
    milestones: ['첫 자전거'],
    mood: 'smile-o',
  },
  {
    date: '2026년 3월 28일', child: '서준',
    title: '구구단 마스터',
    content: '서준이가 드디어 구구단을 전부 외웠어요! 7단이 제일 어려웠는데 노래로 외우니까 금방 했어요.',
    milestones: ['학습 성취'],
    mood: 'star',
  },
  {
    date: '2026년 3월 25일', child: '지우',
    title: '유치원 입학식',
    content: '지우가 유치원에 처음 간 날. 엄마 손을 꼭 잡고 들어가다가, 친구들 보자마자 활짝 웃으면서 뛰어갔어요. 사실 엄마가 더 울뻔...',
    milestones: ['유치원 입학', '첫 등원'],
    mood: 'heart',
  },
  {
    date: '2026년 3월 20일', child: '서준',
    title: '생일 파티',
    content: '서준이 8번째 생일! 친구들 다섯 명 초대해서 케이크 자르고 보물찾기 놀이했어요. "최고의 생일이었어!" 라고 하네요.',
    milestones: ['생일'],
    mood: 'birthday-cake',
  },
  {
    date: '2026년 3월 15일', child: '지우',
    title: '키 90cm 돌파!',
    content: '정기 소아과 검진에서 키 91.2cm, 몸무게 13.5kg. 또래 평균보다 조금 큰 편이래요. 건강하게 잘 자라줘서 고마워~',
    milestones: ['성장 기록'],
    mood: 'line-chart',
  },
];

const CHILD_NAMES = ['전체', '지우', '서준'];
const CHILD_COLORS: Record<string, string> = { '지우': '#FFB6C1', '서준': '#B8D4E6' };

export default function ParentingScreen() {
  const [activeChild, setActiveChild] = useState('전체');

  const filteredEntries = activeChild === '전체'
    ? ENTRIES
    : ENTRIES.filter(e => e.child === activeChild);

  return (
    <>
      <Stack.Screen options={{ title: '육아 일기' }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} onPress={() => setActiveChild('전체')} activeOpacity={0.7}>
              <FontAwesome name="book" size={18} color="#C85A4A" />
              <Text style={styles.statNumber}>47</Text>
              <Text style={styles.statLabel}>총 기록</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => Alert.alert('마일스톤', '지우: 7개\n서준: 5개\n\n마일스톤 관리 기능이 곧 추가됩니다.')} activeOpacity={0.7}>
              <FontAwesome name="trophy" size={18} color="#E6A817" />
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>마일스톤</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => Alert.alert('사진 앨범', '저장된 사진 156장\n\n사진 앨범 기능이 곧 추가됩니다.')} activeOpacity={0.7}>
              <FontAwesome name="camera" size={18} color="#4A90C8" />
              <Text style={styles.statNumber}>156</Text>
              <Text style={styles.statLabel}>사진</Text>
            </TouchableOpacity>
          </View>

          {/* Child Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {CHILD_NAMES.map((name, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.filterChip, activeChild === name && styles.filterChipActive]}
                onPress={() => setActiveChild(name)}
                activeOpacity={0.7}
              >
                {CHILD_COLORS[name] && <View style={[styles.filterDot, { backgroundColor: CHILD_COLORS[name] }]} />}
                <Text style={[styles.filterText, activeChild === name && styles.filterTextActive]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Timeline */}
          <View style={styles.timeline}>
            {filteredEntries.map((entry, i) => (
              <TouchableOpacity
                key={i}
                style={styles.entryCard}
                activeOpacity={0.7}
                onPress={() => Alert.alert(entry.title, `${entry.date} · ${entry.child}\n\n${entry.content}`)}>
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, { backgroundColor: entry.child === '지우' ? '#FFB6C1' : '#B8D4E6' }]} />
                  {i < filteredEntries.length - 1 && <View style={styles.timelineConnector} />}
                </View>
                <View style={styles.entryContent}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>{entry.date}</Text>
                    <View style={[styles.childBadge, { backgroundColor: entry.child === '지우' ? '#FFB6C1' : '#B8D4E6' }]}>
                      <Text style={styles.childBadgeText}>{entry.child}</Text>
                    </View>
                  </View>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  <Text style={styles.entryText} numberOfLines={2}>{entry.content}</Text>
                  <View style={styles.entryFooter}>
                    {entry.milestones.map((ms, mi) => (
                      <TouchableOpacity key={mi} style={styles.milestoneBadge} activeOpacity={0.7} onPress={() => Alert.alert('마일스톤', `"${ms}" 마일스톤이에요!\n\n관련 기록을 모아보는 기능이 곧 추가됩니다.`)}>
                        <FontAwesome name="star" size={10} color="#E6A817" />
                        <Text style={styles.milestoneText}>{ms}</Text>
                      </TouchableOpacity>
                    ))}
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={() => Alert.alert('기분', `이 날의 기분 기록이에요.\n\n기분 변경 기능이 곧 추가됩니다.`)}>
                      <FontAwesome name={entry.mood as any} size={16} color="#BFAE99" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => Alert.alert('육아 일기 작성', '새 육아 일기 작성 기능이 곧 추가됩니다.')}
        >
          <FontAwesome name="pencil" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#F0E8D8',
  },
  statNumber: { fontSize: 22, fontWeight: '700', color: '#2D2D2D', marginTop: 6 },
  statLabel: { fontSize: 11, color: '#7A6B55', marginTop: 2 },
  filterContainer: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E8D8',
  },
  filterChipActive: { backgroundColor: '#C85A4A', borderColor: '#C85A4A' },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: 13, fontWeight: '600', color: '#8B7355' },
  filterTextActive: { color: '#FFFFFF' },
  timeline: { paddingHorizontal: 20 },
  entryCard: { flexDirection: 'row', marginBottom: 4 },
  timelineLine: { width: 24, alignItems: 'center', paddingTop: 6 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#F0E8D8', marginTop: -2 },
  entryContent: {
    flex: 1, marginLeft: 12, marginBottom: 14,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#F0E8D8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryDate: { fontSize: 12, color: '#9C8B75' },
  childBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  childBadgeText: { fontSize: 11, fontWeight: '600', color: '#5C4A32' },
  entryTitle: { fontSize: 16, fontWeight: '700', color: '#2D2D2D', marginBottom: 6 },
  entryText: { fontSize: 13, color: '#5C4A32', lineHeight: 20, marginBottom: 10 },
  entryFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  milestoneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF8E8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  milestoneText: { fontSize: 11, fontWeight: '600', color: '#7A5C10' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#C85A4A', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#C85A4A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
});
