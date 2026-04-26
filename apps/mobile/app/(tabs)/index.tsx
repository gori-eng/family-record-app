import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';

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
  { type: '육아 일기', icon: 'child', color: '#FFB6C1', title: '지우의 첫 자전거 타기', date: '오늘', route: '/(tabs)/records/parenting' },
  { type: '독서 목록', icon: 'book', color: '#B8E6C8', title: '어린 왕자 완독', date: '어제', route: '/(tabs)/records/reading' },
  { type: '가계부', icon: 'money', color: '#FFE4C4', title: '3월 지출 정산', date: '2일 전', route: '/(tabs)/records/finance' },
  { type: '레시피', icon: 'cutlery', color: '#FFDAB9', title: '엄마 김치찌개 레시피', date: '3일 전', route: '/(tabs)/records/recipes' },
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
    <SafeAreaView style={s.container}>
      {/* Notification Modal */}
      <Modal visible={showNotif} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.notifModal}>
            <View style={s.notifHeader}>
              <Text style={s.notifTitle}>알림</Text>
              <TouchableOpacity onPress={() => setShowNotif(false)} activeOpacity={0.7}>
                <FontAwesome name="times" size={20} color="#5C4A32" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {NOTIFICATIONS.map(n => (
                <TouchableOpacity key={n.id} style={[s.notifItem, n.unread && s.notifItemUnread]} activeOpacity={0.7}>
                  <View style={[s.notifIcon, { backgroundColor: n.color }]}>
                    <FontAwesome name={n.icon as any} size={14} color="#5C4A32" />
                  </View>
                  <View style={s.notifContent}>
                    <Text style={s.notifItemTitle}>{n.title}</Text>
                    <Text style={s.notifItemDesc}>{n.desc}</Text>
                  </View>
                  <View style={s.notifMeta}>
                    <Text style={s.notifTime}>{n.time}</Text>
                    {n.unread && <View style={s.notifDot} />}
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
        <View style={s.header}>
          <TouchableOpacity style={s.headerLeft} activeOpacity={0.7} onPress={() => router.push('/(tabs)/settings')}>
            <View style={s.familyAvatar}>
              <FontAwesome name="users" size={18} color="#C85A4A" />
            </View>
            <Text style={s.familyName}>우리 가족</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowNotif(true)}>
            <FontAwesome name="bell-o" size={22} color="#5C4A32" />
            {unreadCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{unreadCount}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={s.greeting}>
          <Text style={s.greetingText}>{greeting}</Text>
          <Text style={s.dateText}>{dateStr}</Text>
        </View>

        {/* Today's Schedule — TOP */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>오늘의 일정</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/calendar')}>
              <Text style={s.seeAll}>캘린더</Text>
            </TouchableOpacity>
          </View>
          {TODAY_EVENTS.map((ev, i) => (
            <TouchableOpacity key={i} style={s.eventItem} activeOpacity={0.7}
              onPress={() => Alert.alert(ev.title, `시간: ${ev.time}\n장소: ${ev.location}\n참여: ${ev.member}`)}>
              <View style={[s.eventColorBar, { backgroundColor: ev.color }]} />
              <View style={s.eventTimeBox}><Text style={[s.eventTimeText, { color: ev.color }]}>{ev.time}</Text></View>
              <View style={s.eventInfo}>
                <Text style={s.eventTitle}>{ev.title}</Text>
                <Text style={s.eventLocation}>{ev.location}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Records — 2x2 Grid */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>최근 기록</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/records')}>
              <Text style={s.seeAll}>전체 보기</Text>
            </TouchableOpacity>
          </View>
          <View style={s.recentGrid}>
            {RECENT_RECORDS.map((rec, i) => (
              <TouchableOpacity key={i} style={s.recentCard} activeOpacity={0.7}
                onPress={() => router.push(rec.route as any)}>
                <View style={[s.recentIcon, { backgroundColor: rec.color }]}>
                  <FontAwesome name={rec.icon as any} size={18} color="#5C4A32" />
                </View>
                <Text style={s.recentTitle} numberOfLines={1}>{rec.title}</Text>
                <Text style={s.recentMeta}>{rec.type} · {rec.date}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  familyAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFDAB9', justifyContent: 'center', alignItems: 'center' },
  familyName: { fontSize: 18, fontWeight: '700', color: '#C85A4A' },
  badge: { position: 'absolute', top: -4, right: -6, backgroundColor: '#E53935', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  greeting: { paddingHorizontal: 20, marginBottom: 20 },
  greetingText: { fontSize: 24, fontWeight: '700', color: '#2D2D2D', marginBottom: 2 },
  dateText: { fontSize: 13, color: '#9C8B75' },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#2D2D2D' },
  seeAll: { fontSize: 13, color: '#C85A4A', fontWeight: '600' },

  eventItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  eventColorBar: { width: 4, height: 40, borderRadius: 2 },
  eventTimeBox: { width: 48, alignItems: 'center' },
  eventTimeText: { fontSize: 14, fontWeight: '700' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: '#2D2D2D', marginBottom: 2 },
  eventLocation: { fontSize: 12, color: '#9C8B75' },

  recentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  recentCard: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  recentIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  recentTitle: { fontSize: 14, fontWeight: '600', color: '#2D2D2D', marginBottom: 4 },
  recentMeta: { fontSize: 11, color: '#9C8B75' },

  // Notification Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  notifModal: { backgroundColor: '#FFFDF0', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', padding: 20, paddingBottom: 40 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0E8D8' },
  notifTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D' },
  notifItem: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, marginBottom: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E8D8' },
  notifItemUnread: { backgroundColor: '#FFF8F0', borderColor: '#F5D5C0' },
  notifIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  notifContent: { flex: 1 },
  notifItemTitle: { fontSize: 14, fontWeight: '600', color: '#2D2D2D', marginBottom: 2 },
  notifItemDesc: { fontSize: 12, color: '#7A6B55' },
  notifMeta: { alignItems: 'flex-end', gap: 4 },
  notifTime: { fontSize: 11, color: '#9C8B75' },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C85A4A' },
});
