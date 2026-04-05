import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, Modal } from 'react-native';
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

const NOTIFICATIONS = [
  { id: 1, icon: 'book', color: '#B8E6C8', title: '서준이가 독서 기록을 추가했어요', desc: '"어린 왕자" 완독!', time: '10분 전', unread: true },
  { id: 2, icon: 'calendar', color: '#B8D4E6', title: '내일 학교 발표회가 있어요', desc: '서현초등학교 14:00', time: '1시간 전', unread: true },
  { id: 3, icon: 'child', color: '#FFB6C1', title: '지우의 육아일지에 새 기록', desc: '첫 자전거 타기 성공!', time: '3시간 전', unread: true },
  { id: 4, icon: 'money', color: '#FFE4C4', title: '이번 달 가계부 정산 알림', desc: '4월 지출 요약이 준비되었어요', time: '어제', unread: false },
  { id: 5, icon: 'trophy', color: '#E6D4B8', title: '가족 목표 달성률 업데이트', desc: '"주말 가족 운동" 75% 달성', time: '2일 전', unread: false },
];

const TODAY_EVENTS = [
  { time: '10:00', title: '서준이 수영 수업', location: '분당 수영장', color: '#4A90C8', member: '서준' },
  { time: '14:00', title: '학교 발표회', location: '서현초등학교', color: '#4AA86B', member: '서준' },
  { time: '18:00', title: '가족 저녁 식사', location: '정자동 한강갈비', color: '#C85A4A', member: '전체' },
];

const RECENT_RECORDS = [
  { type: '육아 일기', icon: 'child', color: '#FFB6C1', title: '지우의 첫 자전거 타기', date: '오늘', preview: '드디어 보조바퀴 없이 자전거를 탔어요!', route: '/(tabs)/records/parenting' },
  { type: '독서 목록', icon: 'book', color: '#B8E6C8', title: '어린 왕자', date: '어제', preview: '서준이가 처음으로 혼자 다 읽었어요', route: '/(tabs)/records/reading' },
  { type: '가계부', icon: 'money', color: '#FFE4C4', title: '3월 지출 정산', date: '2일 전', preview: '식비 82만원, 교육 45만원', route: '/(tabs)/records/finance' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const hour = today.getHours();
  const greeting = hour < 6 ? '좋은 새벽이에요!' : hour < 12 ? '좋은 아침이에요!' : hour < 18 ? '좋은 오후에요!' : '좋은 저녁이에요!';
  const unreadCount = NOTIFICATIONS.filter(n => n.unread).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Notification Modal */}
      <Modal visible={showNotif} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.notifModal}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>알림</Text>
              <TouchableOpacity onPress={() => setShowNotif(false)} activeOpacity={0.7}>
                <FontAwesome name="times" size={20} color="#5C4A32" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {NOTIFICATIONS.map(n => (
                <TouchableOpacity key={n.id} style={[styles.notifItem, n.unread && styles.notifItemUnread]} activeOpacity={0.7}>
                  <View style={[styles.notifIcon, { backgroundColor: n.color }]}>
                    <FontAwesome name={n.icon as any} size={14} color="#5C4A32" />
                  </View>
                  <View style={styles.notifContent}>
                    <Text style={styles.notifItemTitle}>{n.title}</Text>
                    <Text style={styles.notifItemDesc}>{n.desc}</Text>
                  </View>
                  <View style={styles.notifMeta}>
                    <Text style={styles.notifTime}>{n.time}</Text>
                    {n.unread && <View style={styles.notifDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C85A4A" colors={['#C85A4A']} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerLeft} activeOpacity={0.7} onPress={() => router.push('/(tabs)/settings')}>
            <View style={styles.familyAvatar}>
              <FontAwesome name="users" size={18} color="#C85A4A" />
            </View>
            <Text style={styles.familyName}>우리 가족</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowNotif(true)}>
            <FontAwesome name="bell-o" size={22} color="#5C4A32" />
            {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>김지수님, {greeting}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        {/* Family Members */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
          {FAMILY_MEMBERS.map((m, i) => (
            <TouchableOpacity key={i} style={styles.memberChip} activeOpacity={0.7}
              onPress={() => Alert.alert(m.name, `역할: ${m.role}\n\n프로필 상세 보기 기능이 곧 추가됩니다.`)}>
              <View style={[styles.memberAvatar, { backgroundColor: m.color }]}>
                <Text style={styles.memberInitial}>{m.name[0]}</Text>
              </View>
              <Text style={styles.memberName}>{m.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.memberChip} activeOpacity={0.7}
            onPress={() => Alert.alert('가족 초대', '초대 코드: ABC12345\n\n이 코드를 가족에게 공유하세요!')}>
            <View style={[styles.memberAvatar, { backgroundColor: '#F0E8D8' }]}>
              <FontAwesome name="plus" size={14} color="#9C8B75" />
            </View>
            <Text style={styles.memberName}>초대</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Today's Schedule — FIRST */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>오늘의 일정</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/calendar')}>
              <Text style={styles.seeAll}>캘린더 보기</Text>
            </TouchableOpacity>
          </View>
          {TODAY_EVENTS.length === 0 ? (
            <View style={styles.emptyCard}>
              <FontAwesome name="calendar-o" size={28} color="#D4C8B0" />
              <Text style={styles.emptyText}>오늘 일정이 없어요</Text>
            </View>
          ) : (
            TODAY_EVENTS.map((ev, i) => (
              <TouchableOpacity key={i} style={styles.eventItem} activeOpacity={0.7}
                onPress={() => Alert.alert(ev.title, `시간: ${ev.time}\n장소: ${ev.location}\n참여: ${ev.member}`)}>
                <View style={[styles.eventColorBar, { backgroundColor: ev.color }]} />
                <View style={styles.eventTimeBox}>
                  <Text style={[styles.eventTimeText, { color: ev.color }]}>{ev.time}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <View style={styles.eventLocationRow}>
                    <FontAwesome name="map-marker" size={11} color="#9C8B75" />
                    <Text style={styles.eventLocation}>{ev.location}</Text>
                    <View style={styles.eventMemberBadge}>
                      <Text style={styles.eventMemberText}>{ev.member}</Text>
                    </View>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Recent Records */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 기록</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/records')}>
              <Text style={styles.seeAll}>모두 보기</Text>
            </TouchableOpacity>
          </View>
          {RECENT_RECORDS.map((rec, i) => (
            <TouchableOpacity key={i} style={styles.recordItem} activeOpacity={0.7}
              onPress={() => router.push(rec.route as any)}>
              <View style={[styles.recordIcon, { backgroundColor: rec.color }]}>
                <FontAwesome name={rec.icon as any} size={16} color="#5C4A32" />
              </View>
              <View style={styles.recordInfo}>
                <View style={styles.recordTopRow}>
                  <Text style={styles.recordType}>{rec.type}</Text>
                  <Text style={styles.recordDate}>{rec.date}</Text>
                </View>
                <Text style={styles.recordTitle}>{rec.title}</Text>
                <Text style={styles.recordPreview} numberOfLines={1}>{rec.preview}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>빠른 기록</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {[
              { icon: 'pencil', label: '육아 일기', route: '/(tabs)/records/parenting', color: '#FFB6C1' },
              { icon: 'money', label: '가계부', route: '/(tabs)/records/finance', color: '#FFE4C4' },
              { icon: 'book', label: '독서', route: '/(tabs)/records/reading', color: '#B8E6C8' },
              { icon: 'camera', label: '사진/영상', route: '/(tabs)/records/media', color: '#D4B8E6' },
              { icon: 'cutlery', label: '레시피', route: '/(tabs)/records/recipes', color: '#FFDAB9' },
            ].map((q, i) => (
              <TouchableOpacity key={i} style={styles.quickItem} activeOpacity={0.7}
                onPress={() => router.push(q.route as any)}>
                <View style={[styles.quickIcon, { backgroundColor: q.color }]}>
                  <FontAwesome name={q.icon as any} size={18} color="#5C4A32" />
                </View>
                <Text style={styles.quickLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  familyAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFDAB9', justifyContent: 'center', alignItems: 'center',
  },
  familyName: { fontSize: 18, fontWeight: '700', color: '#C85A4A' },
  badge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: '#E53935', borderRadius: 8, minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  greeting: { paddingHorizontal: 20, marginBottom: 12 },
  greetingText: { fontSize: 22, fontWeight: '700', color: '#2D2D2D', marginBottom: 2 },
  dateText: { fontSize: 13, color: '#9C8B75' },

  membersRow: { paddingHorizontal: 20, gap: 14, marginBottom: 20 },
  memberChip: { alignItems: 'center', width: 56 },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  memberInitial: { fontSize: 16, fontWeight: '700', color: '#5C4A32' },
  memberName: { fontSize: 11, fontWeight: '600', color: '#5C4A32' },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#2D2D2D' },
  seeAll: { fontSize: 13, color: '#C85A4A', fontWeight: '600' },

  emptyCard: {
    alignItems: 'center', paddingVertical: 32,
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#F0E8D8',
  },
  emptyText: { fontSize: 14, color: '#9C8B75', marginTop: 8 },

  eventItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  eventColorBar: { width: 4, height: 44, borderRadius: 2 },
  eventTimeBox: { width: 48, alignItems: 'center' },
  eventTimeText: { fontSize: 14, fontWeight: '700' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: '#2D2D2D', marginBottom: 3 },
  eventLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventLocation: { fontSize: 12, color: '#9C8B75' },
  eventMemberBadge: {
    backgroundColor: '#F5F0E5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginLeft: 6,
  },
  eventMemberText: { fontSize: 10, color: '#7A6B55', fontWeight: '600' },

  recordItem: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  recordIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  recordInfo: { flex: 1 },
  recordTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  recordType: { fontSize: 11, color: '#C85A4A', fontWeight: '600' },
  recordDate: { fontSize: 11, color: '#9C8B75' },
  recordTitle: { fontSize: 14, fontWeight: '600', color: '#2D2D2D', marginBottom: 2 },
  recordPreview: { fontSize: 12, color: '#7A6B55', lineHeight: 18 },

  quickRow: { gap: 12 },
  quickItem: { alignItems: 'center', width: 64 },
  quickIcon: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  quickLabel: { fontSize: 11, fontWeight: '600', color: '#5C4A32' },

  // Notification Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  notifModal: {
    backgroundColor: '#FFFDF0', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '75%', padding: 20, paddingBottom: 40,
  },
  notifHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0E8D8',
  },
  notifTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D' },
  notifItem: {
    flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, marginBottom: 6,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E8D8',
  },
  notifItemUnread: { backgroundColor: '#FFF8F0', borderColor: '#F5D5C0' },
  notifIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  notifContent: { flex: 1 },
  notifItemTitle: { fontSize: 14, fontWeight: '600', color: '#2D2D2D', marginBottom: 2 },
  notifItemDesc: { fontSize: 12, color: '#7A6B55' },
  notifMeta: { alignItems: 'flex-end', gap: 4 },
  notifTime: { fontSize: 11, color: '#9C8B75' },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C85A4A' },
});
