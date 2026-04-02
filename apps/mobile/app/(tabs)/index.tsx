import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';

const FAMILY_MEMBERS = [
  { name: '지수', role: '엄마', color: '#FFDAB9' },
  { name: '민준', role: '아빠', color: '#B8D4E6' },
  { name: '지우', role: '딸', color: '#FFB6C1' },
  { name: '서준', role: '아들', color: '#B8E6C8' },
];

const RECENT_RECORDS = [
  { type: '육아 일기', icon: 'child', color: '#FFB6C1', title: '지우의 첫 자전거 타기', date: '오늘', preview: '드디어 보조바퀴 없이 자전거를 탔어요!', route: '/(tabs)/records/parenting' },
  { type: '독서 목록', icon: 'book', color: '#B8E6C8', title: '어린 왕자', date: '어제', preview: '서준이가 처음으로 혼자 다 읽었어요', route: '/(tabs)/records/reading' },
  { type: '가계부', icon: 'money', color: '#FFE4C4', title: '3월 지출 정산', date: '2일 전', preview: '식비 82만원, 교육 45만원', route: '/(tabs)/records/finance' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const hour = today.getHours();
  const greetingTime = hour < 6 ? '좋은 새벽이에요' : hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후에요' : '좋은 저녁이에요';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C85A4A" colors={['#C85A4A']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerLeft} activeOpacity={0.7} onPress={() => router.push('/(tabs)/settings')}>
            <View style={styles.familyAvatar}>
              <FontAwesome name="users" size={20} color="#C85A4A" />
            </View>
            <Text style={styles.familyName}>우리 가족</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.notifBadge} onPress={() => Alert.alert('알림', '새로운 알림 3개\n\n- 서준이가 독서 기록을 추가했어요\n- 내일 학교 발표회가 있어요\n- AI 비서의 오늘의 질문이 도착했어요')}>
            <FontAwesome name="bell-o" size={22} color="#5C4A32" />
            <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.dateText}>{dateStr}</Text>
          <Text style={styles.greetingText}>
            김지수님, {greetingTime}!{'\n'}오늘 하루도 행복하세요
          </Text>
        </View>

        {/* Family Members Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll} contentContainerStyle={styles.membersContainer}>
          {FAMILY_MEMBERS.map((member, i) => (
            <TouchableOpacity
              key={i}
              style={styles.memberChip}
              activeOpacity={0.7}
              onPress={() => Alert.alert(member.name, `역할: ${member.role}\n\n프로필 상세 보기 기능이 곧 추가됩니다.`)}
            >
              <View style={[styles.memberAvatar, { backgroundColor: member.color }]}>
                <Text style={styles.memberInitial}>{member.name[0]}</Text>
              </View>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.memberChip} onPress={() => Alert.alert('가족 초대', '초대 코드: ABC12345\n\n이 코드를 가족에게 공유하세요!')}>
            <View style={[styles.memberAvatar, { backgroundColor: '#F0E8D8' }]}>
              <FontAwesome name="plus" size={16} color="#BFAE99" />
            </View>
            <Text style={styles.memberName}>초대</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* AI Daily Question */}
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <FontAwesome name="magic" size={14} color="#C85A4A" />
            <Text style={styles.questionLabel}>AI 비서의 오늘의 질문</Text>
          </View>
          <Text style={styles.questionText}>
            "오늘 가장 감사했던 순간은?"
          </Text>
          <View style={styles.questionFooter}>
            <TouchableOpacity style={styles.answerButton} onPress={() => router.push('/(tabs)/ai')}>
              <Text style={styles.answerButtonText}>답변하기</Text>
              <FontAwesome name="arrow-right" size={12} color="#C85A4A" />
            </TouchableOpacity>
            <Text style={styles.answerCount}>2/4명 답변</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'calendar', label: '일정 관리', route: '/(tabs)/calendar', color: '#FFDAB9' },
            { icon: 'money', label: '가계부', route: '/(tabs)/records/finance', color: '#FFE4C4' },
            { icon: 'child', label: '육아 일기', route: '/(tabs)/records/parenting', color: '#FFB6C1' },
            { icon: 'book', label: '독서 목록', route: '/(tabs)/records/reading', color: '#B8E6C8' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionItem}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: item.color }]}>
                <FontAwesome name={item.icon as any} size={22} color="#5C4A32" />
              </View>
              <Text style={styles.quickActionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>오늘의 일정</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
              <Text style={styles.seeAll}>모두 보기</Text>
            </TouchableOpacity>
          </View>
          {[
            { time: '14:00', title: '학교 발표회', location: '서현초등학교', color: '#4A90C8' },
            { time: '18:00', title: '가족 저녁 식사', location: '정자동 한강갈비', color: '#C85A4A' },
          ].map((event, i) => (
            <TouchableOpacity key={i} style={styles.eventItem} onPress={() => router.push('/(tabs)/calendar')} activeOpacity={0.7}>
              <View style={styles.eventTimeBox}>
                <Text style={[styles.eventTimeText, { color: event.color }]}>{event.time}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <View style={styles.eventLocationRow}>
                  <FontAwesome name="map-marker" size={12} color="#BFAE99" />
                  <Text style={styles.eventLocation}>{event.location}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Records */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 기록</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/records')}>
              <Text style={styles.seeAll}>모두 보기</Text>
            </TouchableOpacity>
          </View>
          {RECENT_RECORDS.map((record, i) => (
            <TouchableOpacity key={i} style={styles.recordItem} onPress={() => router.push(record.route as any)}>
              <View style={[styles.recordIcon, { backgroundColor: record.color }]}>
                <FontAwesome name={record.icon as any} size={16} color="#5C4A32" />
              </View>
              <View style={styles.recordInfo}>
                <View style={styles.recordTopRow}>
                  <Text style={styles.recordType}>{record.type}</Text>
                  <Text style={styles.recordDate}>{record.date}</Text>
                </View>
                <Text style={styles.recordTitle}>{record.title}</Text>
                <Text style={styles.recordPreview} numberOfLines={1}>{record.preview}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  familyAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFDAB9', justifyContent: 'center', alignItems: 'center',
  },
  familyName: { fontSize: 20, fontWeight: '700', color: '#C85A4A' },
  notifBadge: { position: 'relative' },
  badge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: '#C85A4A', borderRadius: 8,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  greeting: { paddingHorizontal: 20, marginBottom: 16 },
  dateText: { fontSize: 14, color: '#8B7355', marginBottom: 4 },
  greetingText: { fontSize: 22, fontWeight: '700', color: '#2D2D2D', lineHeight: 32 },

  // Family members
  membersScroll: { marginBottom: 20 },
  membersContainer: { paddingHorizontal: 20, gap: 12 },
  memberChip: { alignItems: 'center', width: 60 },
  memberAvatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  memberInitial: { fontSize: 18, fontWeight: '700', color: '#5C4A32' },
  memberName: { fontSize: 12, fontWeight: '600', color: '#2D2D2D' },
  memberRole: { fontSize: 10, color: '#BFAE99' },

  // Question card
  questionCard: {
    marginHorizontal: 20, backgroundColor: '#FFDAB9',
    borderRadius: 16, padding: 20, marginBottom: 24,
  },
  questionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  questionLabel: { fontSize: 12, color: '#C85A4A', fontWeight: '600' },
  questionText: { fontSize: 18, fontWeight: '600', color: '#2D2D2D', marginBottom: 16 },
  questionFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  answerButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFDF0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
  },
  answerButtonText: { fontSize: 14, fontWeight: '600', color: '#C85A4A' },
  answerCount: { fontSize: 12, color: '#8B6914', fontWeight: '500' },

  // Quick actions
  quickActions: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, gap: 12, marginBottom: 24,
  },
  quickActionItem: {
    width: '47%', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  quickActionIcon: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  quickActionLabel: { fontSize: 13, fontWeight: '600', color: '#5C4A32' },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D' },
  seeAll: { fontSize: 13, color: '#C85A4A', fontWeight: '600' },

  // Events
  eventItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  eventTimeBox: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: '#FFF8F0', justifyContent: 'center', alignItems: 'center',
  },
  eventTimeText: { fontSize: 14, fontWeight: '700' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: '#2D2D2D', marginBottom: 4 },
  eventLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventLocation: { fontSize: 12, color: '#BFAE99' },

  // Recent records
  recordItem: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  recordIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  recordInfo: { flex: 1 },
  recordTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  recordType: { fontSize: 11, color: '#C85A4A', fontWeight: '600' },
  recordDate: { fontSize: 11, color: '#BFAE99' },
  recordTitle: { fontSize: 14, fontWeight: '600', color: '#2D2D2D', marginBottom: 2 },
  recordPreview: { fontSize: 12, color: '#8B7355' },
});
