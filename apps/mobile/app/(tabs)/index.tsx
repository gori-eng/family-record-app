import { iga } from '../../lib/korean';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal, Animated, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRecentRecords, useRecordsStore, CATEGORY_LABELS, relativeDay, type RecordCategory } from '../../store/records';
import { useMe, useFamilyInfo, useCanSee } from '../../store/family';
import { useMyFamilies, useSession } from '../../store/session';
import { useTodayEvents, useEventsStore, formatTime, membersLabel, dayIndexOf, todayISO } from '../../store/events';
import { useFamilyNews, type NewsItem } from '../../store/news';
import { LoadingRows, useRecordsReady, useEventsReady } from '../../components/Loading';
import { CATEGORY_UI } from '../../constants/categoryUi';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

/*
 * 알림(🔔) — store/news.ts가 모은 **진짜 가족 소식**을 보여준다 (2026-09-29).
 * 다른 가족이 최근 남긴 기록 + 오늘·내일 일정.
 *
 * ⚠️ 예전엔 가짜 알림 5개가 박혀 있었다("독서 기록을 추가했어요 — 서준" 등).
 *    진짜 가족으로 로그인하자 **없는 일을 알려주는 알림**이 됐고, 벨의 '3'이
 *    확인할 게 있다고 믿게 만들었다. 그래서 비워뒀다가 이제 진짜로 채웠다.
 */


export default function HomeScreen() {
  const router = useRouter();
  // 창고에서 최근에 쓴 기록 4개 — 카테고리 상관없이
  const recent = useRecentRecords(4);
  // 로그인한 사람의 짧은 이름 (없으면 예시 가족의 '지수') — store/family.ts
  const me = useMe();
  const canSee = useCanSee();
  // 가족이 둘 이상이면 지금 어느 가족을 보고 있는지 날짜 옆에 적는다
  const familyInfo = useFamilyInfo();
  const familyCount = useMyFamilies().length;
  // 오늘 일정 — 캘린더와 **같은 보관소**를 본다
  const todayEvents = useTodayEvents();
  const recordsReady = useRecordsReady();
  const eventsReady = useEventsReady();
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

  /** 당겨서 새로고침 — 가족·기록·일정을 실제로 다시 불러온다 (예전엔 1초 빙글 돌고 끝이었다, 점검 B1) */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const s = useSession.getState();
      const fid = s.family?.id;
      const uid = s.userId;
      await Promise.all([
        s.refresh(),
        fid && uid ? useRecordsStore.getState().load(fid, uid) : Promise.resolve(),
        fid && uid ? useEventsStore.getState().load(fid, uid) : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const hour = today.getHours();
  const greeting = hour < 6 ? '새벽이네요' : hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
  const news = useFamilyNews();
  const unreadCount = news.unread;

  /**
   * "그때 오늘" — 지난해(들) 같은 월·일에 남긴 기록. 가족 기록장의 재미 중 하나다.
   * (2026-09-23 전체 점검에서 떠오른 아이디어 → 2026-09-29 C단계에서 구현)
   */
  const allRecords = useRecordsStore((s) => s.records);
  const yearsAgo = useMemo(() => {
    const now = new Date();
    const out: { rec: typeof allRecords[number]; years: number }[] = [];
    for (const rec of allRecords) {
      const d = new Date(rec.createdAt);
      if (d.getMonth() === now.getMonth() && d.getDate() === now.getDate() && d.getFullYear() < now.getFullYear()) {
        out.push({ rec, years: now.getFullYear() - d.getFullYear() });
      }
    }
    return out.sort((a, b) => a.years - b.years).slice(0, 3);
  }, [allRecords]);

  /** 그 기록 화면으로 가서 상세까지 바로 연다 (9개 화면 모두 `openId`를 받는다 — lib/useOpenParam) */
  const openRecord = (category: RecordCategory, id?: string) => {
    const path = `/(tabs)/records/${CATEGORY_UI[category].screen}`;
    if (id) router.push({ pathname: path as any, params: { openId: id } });
    else router.push(path as any);
  };

  /** 소식을 누르면 그 기록(또는 캘린더)으로 간다 */
  const openNews = (n: NewsItem) => {
    closeNotif();
    if (n.kind === 'event' || !n.category) {
      router.push('/(tabs)/calendar');
      return;
    }
    openRecord(n.category, n.recordId);
  };

  // 7. 모달 열기/닫기 애니메이션
  const openNotif = () => {
    setShowNotif(true);
    Animated.parallel([
      Animated.timing(modalBgAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(modalSlideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };
  const closeNotif = () => {
    // 닫을 때 '다 봤다'로 적는다. 열 때 적으면 새 소식 점이 보이자마자 사라진다
    news.markSeen();
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
              {news.items.length === 0 && (
                <View style={s.notifEmpty}>
                  <FontAwesome name="bell-o" size={28} color="#D0D0D0" />
                  <Text style={s.notifEmptyTitle}>아직 새 소식이 없어요</Text>
                  <Text style={s.notifEmptySub}>가족이 뭔가 남기거나 일정이 다가오면 여기서 알려줄게요</Text>
                </View>
              )}
              {news.items.map(n => (
                <TouchableOpacity key={n.id} style={[s.notifItem, n.unread && s.notifItemUnread]} activeOpacity={0.7}
                  onPress={() => openNews(n)}>
                  <View style={[s.notifIcon, { backgroundColor: n.category ? CATEGORY_UI[n.category].bg : '#B8D8C0' }]}>
                    <FontAwesome name={(n.category ? CATEGORY_UI[n.category].icon : 'calendar') as any} size={14} color="#4A4A4A" />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A8C6F" colors={['#4A8C6F']} />}
      >
        {/* Header — 로고 + 알림 (§7) */}
        <View style={s.header}>
          <Text style={s.logo}>familog</Text>
          <View style={s.headerSpacer} />
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/records/search' as any)} style={s.headerIcon}
            accessibilityLabel="기록 찾기">
            <FontAwesome name="search" size={19} color="#1F1F1F" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={openNotif} style={s.headerIcon}>
            <FontAwesome name="bell-o" size={20} color="#1F1F1F" />
            {unreadCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{unreadCount}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* 1. Hero — 한 줄 인사 */}
        <Animated.View style={[s.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.greetingLine}>{me ? `${me}님, ${greeting}` : greeting}</Text>
          <Text style={s.dateText}>{familyCount > 1 ? `${familyInfo.name}의 ` : ''}{dateStr} {dayName}</Text>
        </Animated.View>

        {/* 아직 혼자인 가족 — 초대가 설정 깊숙이 숨어 있어 아무도 안내하지 않았다 (제품 검토 🔴) */}
        {familyInfo.isReal && familyInfo.memberCount === 1 && !!familyInfo.inviteCode && (
          <TouchableOpacity style={s.inviteCard} activeOpacity={0.8} onPress={async () => {
            try {
              await Share.share({ message: `우리 가족 기록장에 같이 적어요. familog 앱을 열고 초대 코드 ${familyInfo.inviteCode}를 넣으면 들어올 수 있어요.` });
            } catch {
              router.push('/settings/members' as any);
            }
          }}>
            <View style={s.inviteIcon}><FontAwesome name="envelope-o" size={18} color="#2D5A3F" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.inviteTitle}>아직 혼자예요</Text>
              <Text style={s.inviteSub}>초대 코드 {familyInfo.inviteCode}를 가족에게 보내볼까요? 누르면 바로 보낼 수 있어요</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#4A8C6F" />
          </TouchableOpacity>
        )}

        {/* 오늘의 일정 */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>오늘 일정</Text>
              <Text style={s.sectionSub}>{todayEvents.length > 0 ? `${todayEvents.length}개 있어요` : '느긋한 하루예요'}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/calendar')} style={s.seeAllBtn}>
              <Text style={s.seeAllText}>전체</Text>
              <FontAwesome name="arrow-right" size={11} color="#4A8C6F" />
            </TouchableOpacity>
          </View>
          {todayEvents.length === 0 && !eventsReady ? (
            <LoadingRows label="오늘 일정을 살펴보고 있어요" />
          ) : todayEvents.length === 0 ? (
            <TouchableOpacity style={s.emptyState} activeOpacity={0.7} onPress={() => router.push('/(tabs)/calendar')}>
              <FontAwesome name="calendar-o" size={32} color="#D0D0D0" />
              <Text style={s.emptyTitle}>오늘은 일정이 없어요</Text>
              <Text style={s.emptySub}>약속이 생기면 눌러서 적어두세요</Text>
            </TouchableOpacity>
          ) : (
          <View style={s.timeline}>
            {todayEvents.map((ev, i) => (
              <TouchableOpacity key={i} style={s.timelineItem} activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/calendar')}>
                <View style={s.timelineLeft}>
                  <Text style={s.timelineTime}>{ev.endDate && ev.endDate > ev.date ? `${dayIndexOf(ev, todayISO())?.nth ?? 1}째 날` : formatTime(ev.time)}</Text>
                  <View style={[s.timelineDot, { backgroundColor: ev.color }]} />
                  {i < todayEvents.length - 1 && <View style={s.timelineLine} />}
                </View>
                <View style={[s.timelineCard, { borderLeftColor: ev.color }]}>
                  <Text style={s.timelineTitle}>{ev.title}</Text>
                  {!!ev.location && (
                    <View style={s.timelineRow}>
                      <FontAwesome name="map-marker" size={10} color="#A0A0A0" />
                      <Text style={s.timelineLoc}>{ev.location}</Text>
                    </View>
                  )}
                  <View style={s.timelineMemberWrap}>
                    <Text style={s.timelineMember}>{membersLabel(ev.members)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          )}
        </View>

        {/* N년 전 오늘 — 같은 날짜에 남긴 지난해 기록. 없으면 아예 안 보인다 */}
        {yearsAgo.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionTitle}>그때 오늘</Text>
                <Text style={s.sectionSub}>오늘과 같은 날에 남겨둔 기록이에요</Text>
              </View>
            </View>
            {yearsAgo.map(({ rec, years }) => {
              const ui = CATEGORY_UI[rec.category];
              return (
                <TouchableOpacity key={rec.id} style={s.memoryRow} activeOpacity={0.7}
                  onPress={() => openRecord(rec.category, rec.id)}>
                  <View style={[s.memoryIcon, { backgroundColor: ui.bg }]}>
                    <FontAwesome name={ui.icon as any} size={14} color="#5C4A32" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.memoryTitle} numberOfLines={1}>{rec.title}</Text>
                    <Text style={s.memoryMeta}>{years}년 전 오늘, {rec.recordedBy}{iga(rec.recordedBy)} 남긴 {CATEGORY_LABELS[rec.category]}</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={11} color="#D4C8B0" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 빠른 기록 */}
        <View style={s.quickSection}>
          <Text style={s.quickTitle}>바로 적기</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickScroll}>
            {[
              { icon: 'pencil', label: '일기', route: '/(tabs)/records/parenting' },
              { icon: 'money', label: '가계부', route: '/(tabs)/records/finance', category: 'finance' },
              { icon: 'book', label: '독서', route: '/(tabs)/records/reading' },
              { icon: 'plane', label: '여행', route: '/(tabs)/records/travel' },
              { icon: 'cutlery', label: '레시피', route: '/(tabs)/records/recipes' },
              { icon: 'film', label: '영화', route: '/(tabs)/records/movies' },
            ].filter((q) => !q.category || canSee(q.category)).map((q, i) => (
              <TouchableOpacity key={i} style={s.quickChip} activeOpacity={0.7}
                onPress={() => router.push({ pathname: q.route as any, params: { new: '1' } })}>
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
              <Text style={s.sectionSub}>가족이 요즘 남긴 것들</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/records')} style={s.seeAllBtn}>
              <Text style={s.seeAllText}>전체</Text>
              <FontAwesome name="arrow-right" size={11} color="#4A8C6F" />
            </TouchableOpacity>
          </View>
          {recent.length === 0 && !recordsReady ? (
            <LoadingRows label="기록을 꺼내오고 있어요" />
          ) : recent.length === 0 ? (
            <TouchableOpacity style={s.emptyState} activeOpacity={0.7} onPress={() => router.push('/(tabs)/records')}>
              <FontAwesome name="pencil-square-o" size={32} color="#D0D0D0" />
              <Text style={s.emptyTitle}>아직 기록이 없어요</Text>
              <Text style={s.emptySub}>오늘 있었던 일부터 하나 남겨볼까요?</Text>
            </TouchableOpacity>
          ) : (
          <View style={s.recordGrid}>
            {recent.map((rec, i) => {
              const ui = CATEGORY_UI[rec.category];
              return (
              <TouchableOpacity key={rec.id} style={s.recordCard} activeOpacity={0.85}
                onPress={() => openRecord(rec.category, rec.id)}>
                <View style={[s.recordInner, { backgroundColor: ui.bg }]}>
                  {/* 아이콘 우측 중앙 */}
                  <View style={s.recordIconWrap}>
                    <FontAwesome name={ui.icon as any} size={22} color="rgba(0,0,0,0.1)" />
                  </View>
                  <View style={s.recordBottom}>
                    <Text style={[s.recordType, { fontSize: i === 0 ? 11 : 10 }]}>{CATEGORY_LABELS[rec.category]}</Text>
                    <Text style={[s.recordTitle, { fontSize: i === 0 ? 16 : 13 }]} numberOfLines={1}>{rec.title}</Text>
                    <Text style={s.recordDate}>{relativeDay(rec.createdAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              );
            })}
          </View>
          )}
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
  headerSpacer: { flex: 1 },
  logo: { fontSize: 24, color: '#2D5A3F', fontFamily: 'GaeguBold', transform: [{ rotate: '-2deg' }] },
  headerIcon: { padding: 8 },
  memoryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EAEAEA' },
  memoryIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  memoryTitle: { fontSize: 14, color: '#1F1F1F', fontFamily: 'PretendardBold' },
  memoryMeta: { fontSize: 12, color: '#767676', marginTop: 2, fontFamily: 'Pretendard' },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#4A8C6F', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // 1. Hero — 한 줄
  hero: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  inviteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 24, padding: 16, backgroundColor: '#EFF6F1', borderRadius: 16, borderWidth: 1, borderColor: '#D5E6DB' },
  inviteIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  inviteTitle: { fontSize: 15, color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 2 },
  inviteSub: { fontSize: 13, color: '#4A4A4A', fontFamily: 'Pretendard', lineHeight: 18 },
  greetingLine: { fontSize: 26, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.5 },
  dateText: { fontSize: 13, color: '#767676', marginTop: 4, fontFamily: 'Pretendard' },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: '#767676', marginTop: 2 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  seeAllText: { fontSize: 13, color: '#4A8C6F', fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 36, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EAEAEA' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#6B6B6B', marginTop: 12, fontFamily: 'Pretendard' },
  emptySub: { fontSize: 13, color: '#767676', marginTop: 4, fontFamily: 'Pretendard' },

  // Timeline
  timeline: {},
  timelineItem: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { width: 56, alignItems: 'center', paddingTop: 2 },
  timelineTime: { fontSize: 12, fontWeight: '600', color: '#6B6B6B', marginBottom: 6, fontFamily: 'Pretendard' },
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
  timelineLoc: { fontSize: 12, color: '#767676' },
  timelineMemberWrap: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#F4F3F0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  timelineMember: { fontSize: 12, fontWeight: '600', color: '#6B6B6B' },

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
  recordDate: { fontSize: 12, color: 'rgba(0,0,0,0.25)', marginTop: 2 },

  // 7. Notification Modal — 커스텀 애니메이션
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  notifEmpty: { alignItems: 'center', paddingVertical: 36 },
  notifEmptyTitle: { fontSize: 15, fontWeight: '600', color: '#7A6B55', marginTop: 12, fontFamily: 'Pretendard' },
  notifEmptySub: { fontSize: 12, color: '#7A6B55', marginTop: 4, fontFamily: 'Pretendard' },
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
  notifAuthorDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4A8C6F' },
  notifAuthor: { fontSize: 12, fontWeight: '600', color: '#6B6B6B', fontFamily: 'Pretendard' },
  notifItemDesc: { fontSize: 12, color: '#6B6B6B' },
  notifMeta: { alignItems: 'flex-end', gap: 4 },
  notifTime: { fontSize: 12, color: '#767676' },
  notifDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4A8C6F' },
});
