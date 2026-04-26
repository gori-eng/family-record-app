import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal, Animated, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';

const NOTIFICATIONS = [
  { id: 1, icon: 'book', color: '#B8D8C0', title: '독서 기록을 추가했어요', desc: '"어린 왕자" 완독!', time: '10분 전', unread: true, author: '서준' },
  { id: 2, icon: 'calendar', color: '#B0C8D8', title: '내일 학교 발표회가 있어요', desc: '서현초등학교 14:00', time: '1시간 전', unread: true, author: '시스템' },
  { id: 3, icon: 'child', color: '#F0B8B8', title: '육아일지에 새 기록을 남겼어요', desc: '첫 자전거 타기 성공!', time: '3시간 전', unread: true, author: '지수' },
  { id: 4, icon: 'money', color: '#E8D8C0', title: '이번 달 가계부 정산 알림', desc: '4월 지출 요약이 준비되었어요', time: '어제', unread: false, author: '시스템' },
  { id: 5, icon: 'trophy', color: '#D8CDB8', title: '가족 목표 달성률 업데이트', desc: '"주말 가족 운동" 75% 달성', time: '2일 전', unread: false, author: '민준' },
];

const TODAY_EVENTS = [
  { time: '10:00', endTime: '11:00', title: '서준이 수영 수업', location: '분당 수영장', color: '#4A8EC8', member: '서준' },
  { time: '14:00', endTime: '16:00', title: '학교 발표회', location: '서현초등학교', color: '#3D9A5F', member: '서준' },
  { time: '18:00', endTime: '20:00', title: '가족 저녁 식사', location: '정자동 한강갈비', color: '#C05A4E', member: '전체' },
];

const RECENT_RECORDS = [
  { type: '육아 일기', icon: 'child', bg: '#F0B8B8', title: '지우의 첫 자전거', date: '오늘', route: '/(tabs)/records/parenting' },
  { type: '독서 목록', icon: 'book', bg: '#B8D8C0', title: '어린 왕자 완독', date: '어제', route: '/(tabs)/records/reading' },
  { type: '가계부', icon: 'money', bg: '#E8D8C0', title: '3월 지출 정산', date: '2일 전', route: '/(tabs)/records/finance' },
  { type: '레시피', icon: 'cutlery', bg: '#E8D0C0', title: '엄마 김치찌개', date: '3일 전', route: '/(tabs)/records/recipes' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  // 7. 알림 모달 애니메이션
  const modalBgAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(400)).current;

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}월 ${today.getDate()}일`;
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayName = dayNames[today.getDay()];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const hour = today.getHours();
  const greeting = hour < 6 ? '새벽이네요' : hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
  const unreadCount = NOTIFICATIONS.filter(n => n.unread).length;

  // 7. 모달 열기/닫기 애니메이션
  const openNotif = () => {
    setShowNotif(true);
    Animated.parallel([
      Animated.timing(modalBgAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(modalSlideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };
  const closeNotif = () => {
    Animated.parallel([
      Animated.timing(modalBgAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(modalSlideAnim, { toValue: 400, duration: 250, useNativeDriver: true }),
    ]).start(() => setShowNotif(false));
  };

  return (
    <SafeAreaView style={s.container}>
      {/* 7. 알림 모달 — 커스텀 애니메이션 */}
      <Modal visible={showNotif} transparent statusBarTranslucent animationType="none">
        <View style={s.modalWrap}>
          <Animated.View style={[s.modalBg, { opacity: modalBgAnim }]}>
            <Pressable style={{ flex: 1 }} onPress={closeNotif} />
          </Animated.View>
          <Animated.View style={[s.notifModal, { transform: [{ translateY: modalSlideAnim }] }]}>
            <View style={s.notifHandle} />
            <View style={s.notifHeader}>
              <Text style={s.notifTitle}>알림</Text>
              <TouchableOpacity onPress={closeNotif} activeOpacity={0.7} style={s.notifClose}>
                <FontAwesome name="times" size={18} color="#888" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {NOTIFICATIONS.map(n => (
                <TouchableOpacity key={n.id} style={[s.notifItem, n.unread && s.notifItemUnread]} activeOpacity={0.7}>
                  <View style={[s.notifIcon, { backgroundColor: n.color }]}>
                    <FontAwesome name={n.icon as any} size={14} color="#4A4A4A" />
                  </View>
                  <View style={s.notifContent}>
                    <Text style={s.notifItemTitle}>{n.title}</Text>
                    <Text style={s.notifItemDesc}>{n.desc}</Text>
                    <View style={s.notifAuthorRow}>
                      <View style={s.notifAuthorDot} />
                      <Text style={s.notifAuthor}>{n.author}</Text>
                    </View>
                  </View>
                  <View style={s.notifMeta}>
                    <Text style={s.notifTime}>{n.time}</Text>
                    {n.unread && <View style={s.notifDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C05A4E" colors={['#C05A4E']} />}
      >
        {/* Header — 알림만 */}
        <View style={s.header}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity activeOpacity={0.7} onPress={openNotif} style={s.headerIcon}>
            <FontAwesome name="bell-o" size={20} color="#1F1F1F" />
            {unreadCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{unreadCount}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* 1. Hero — 한 줄 인사 */}
        <Animated.View style={[s.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.greetingLine}>지수님, {greeting}</Text>
          <Text style={s.dateText}>{dateStr} {dayName}</Text>
        </Animated.View>

        {/* 오늘의 일정 */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>오늘의 일정</Text>
              <Text style={s.sectionSub}>{TODAY_EVENTS.length}개의 일정</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/calendar')} style={s.seeAllBtn}>
              <Text style={s.seeAllText}>전체</Text>
              <FontAwesome name="arrow-right" size={11} color="#C05A4E" />
            </TouchableOpacity>
          </View>
          <View style={s.timeline}>
            {TODAY_EVENTS.map((ev, i) => (
              <TouchableOpacity key={i} style={s.timelineItem} activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/calendar')}>
                <View style={s.timelineLeft}>
                  <Text style={s.timelineTime}>{ev.time}</Text>
                  <View style={[s.timelineDot, { backgroundColor: ev.color }]} />
                  {i < TODAY_EVENTS.length - 1 && <View style={s.timelineLine} />}
                </View>
                <View style={[s.timelineCard, { borderLeftColor: ev.color }]}>
                  <Text style={s.timelineTitle}>{ev.title}</Text>
                  <View style={s.timelineRow}>
                    <FontAwesome name="map-marker" size={10} color="#A0A0A0" />
                    <Text style={s.timelineLoc}>{ev.location}</Text>
                  </View>
                  <View style={s.timelineMemberWrap}>
                    <Text style={s.timelineMember}>{ev.member}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 빠른 기록 */}
        <View style={s.quickSection}>
          <Text style={s.quickTitle}>빠른 기록</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickScroll}>
            {[
              { icon: 'pencil', label: '일기', route: '/(tabs)/records/parenting' },
              { icon: 'money', label: '가계부', route: '/(tabs)/records/finance' },
              { icon: 'book', label: '독서', route: '/(tabs)/records/reading' },
              { icon: 'camera', label: '사진', route: '/(tabs)/records/media' },
              { icon: 'cutlery', label: '레시피', route: '/(tabs)/records/recipes' },
              { icon: 'film', label: '영화', route: '/(tabs)/records/movies' },
            ].map((q, i) => (
              <TouchableOpacity key={i} style={s.quickChip} activeOpacity={0.7}
                onPress={() => router.push(q.route as any)}>
                <FontAwesome name={q.icon as any} size={15} color="#666" />
                <Text style={s.quickLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 최근 기록 — 4. 카드 높이 축소, 아이콘 우측 중앙 */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>최근 기록</Text>
              <Text style={s.sectionSub}>가족이 남긴 기록들</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/records')} style={s.seeAllBtn}>
              <Text style={s.seeAllText}>전체</Text>
              <FontAwesome name="arrow-right" size={11} color="#C05A4E" />
            </TouchableOpacity>
          </View>
          <View style={s.recordGrid}>
            {RECENT_RECORDS.map((rec, i) => (
              <TouchableOpacity key={i} style={[s.recordCard, i === 0 && s.recordCardLarge]} activeOpacity={0.85}
                onPress={() => router.push(rec.route as any)}>
                <View style={[s.recordInner, { backgroundColor: rec.bg }]}>
                  {/* 아이콘 우측 중앙 */}
                  <View style={s.recordIconWrap}>
                    <FontAwesome name={rec.icon as any} size={i === 0 ? 32 : 22} color="rgba(0,0,0,0.1)" />
                  </View>
                  <View style={s.recordBottom}>
                    <Text style={[s.recordType, { fontSize: i === 0 ? 11 : 10 }]}>{rec.type}</Text>
                    <Text style={[s.recordTitle, { fontSize: i === 0 ? 16 : 13 }]} numberOfLines={1}>{rec.title}</Text>
                    <Text style={s.recordDate}>{rec.date}</Text>
                  </View>
                </View>
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
  container: { flex: 1, backgroundColor: '#F9F8F5' },

  // Header — 2. 프로필 우측
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4, gap: 10 },
  headerIcon: { padding: 8 },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#C05A4E', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  // 1. Hero — 한 줄
  hero: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  greetingLine: { fontSize: 26, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.5 },
  dateText: { fontSize: 13, color: '#A0A0A0', marginTop: 4, fontFamily: 'Pretendard' },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: '#A0A0A0', marginTop: 2 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  seeAllText: { fontSize: 13, color: '#C05A4E', fontWeight: '600' },

  // Timeline
  timeline: {},
  timelineItem: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { width: 56, alignItems: 'center', paddingTop: 2 },
  timelineTime: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, fontFamily: 'Pretendard' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, zIndex: 1 },
  timelineLine: { width: 1.5, flex: 1, backgroundColor: '#E0E0E0', marginTop: -1 },
  timelineCard: {
    flex: 1, marginLeft: 8, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  timelineTitle: { fontSize: 15, fontWeight: '600', color: '#1F1F1F', marginBottom: 4, fontFamily: 'Pretendard' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timelineLoc: { fontSize: 12, color: '#A0A0A0' },
  timelineMemberWrap: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#F4F3F0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  timelineMember: { fontSize: 10, fontWeight: '600', color: '#888' },

  // 6. Quick Record — 일정과 기록 사이
  quickSection: { paddingLeft: 20, marginBottom: 32 },
  quickTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3, marginBottom: 10 },
  quickScroll: { gap: 8 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 24, borderWidth: 1, borderColor: '#EAEAEA',
  },
  quickLabel: { fontSize: 13, fontWeight: '500', color: '#4A4A4A', fontFamily: 'Pretendard' },

  // 4. Record Cards — 높이 축소, 아이콘 위치 조정
  recordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  recordCard: { width: '47%', borderRadius: 16, overflow: 'hidden' },
  recordCardLarge: { width: '100%', marginBottom: 2 },
  recordInner: {
    paddingHorizontal: 16, paddingVertical: 14,
    minHeight: 80, justifyContent: 'flex-end', borderRadius: 16,
  },
  recordIconWrap: { position: 'absolute', right: 14, top: '50%', marginTop: -12 },
  recordBottom: {},
  recordType: { color: 'rgba(0,0,0,0.35)', fontWeight: '600', marginBottom: 2 },
  recordTitle: { color: 'rgba(0,0,0,0.7)', fontWeight: '700', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  recordDate: { fontSize: 11, color: 'rgba(0,0,0,0.25)', marginTop: 2 },

  // 7. Notification Modal — 커스텀 애니메이션
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  notifModal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingHorizontal: 20, paddingBottom: 40 },
  notifHandle: { width: 36, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 12 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  notifTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  notifClose: { padding: 4 },
  notifItem: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, marginBottom: 6, backgroundColor: '#FAFAFA' },
  notifItemUnread: { backgroundColor: '#F5F0EC' },
  notifIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  notifContent: { flex: 1 },
  notifItemTitle: { fontSize: 14, fontWeight: '600', color: '#1F1F1F', marginBottom: 2 },
  notifAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  notifAuthorDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C05A4E' },
  notifAuthor: { fontSize: 11, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  notifItemDesc: { fontSize: 12, color: '#888' },
  notifMeta: { alignItems: 'flex-end', gap: 4 },
  notifTime: { fontSize: 11, color: '#A0A0A0' },
  notifDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C05A4E' },
});
