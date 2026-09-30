import { DateField } from '../../components/DateField';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, Animated, Pressable, KeyboardAvoidingView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { usePlacesStore, usePlaceSuggestions } from '../../store/places';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { showAlert } from '../../components/AppAlert';
import { useFamilyMembers, useMe, useCanDelete, useCanEdit } from '../../store/family';
import { eulreul } from '../../lib/korean';
import { parseLooseDate } from '../../lib/dates';
import { nameColor } from '../../lib/nameColor';
import { LoadingRows, useEventsReady } from '../../components/Loading';
import {
  useEventsStore, useEventsOn, useEventDaysInMonth, useEventDotsInMonth, eventColor, dayIndexOf, toISO,
  EVENT_COLORS, formatTime, formatEventDate, membersLabel, normalizeTime, todayISO,
  type CalendarEvent,
} from '../../store/events';

const tomorrowISO = () => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** 시간 입력을 한 번에 채우는 버튼 — 자주 쓰는 시간대 */
const TIME_CHIPS = ['09:00', '12:00', '15:00', '18:00', '20:00'];

/** 며칠 뒤의 'YYYY-MM-DD' */
const addDaysISO = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return toISO(d); };

export default function CalendarScreen() {
  // 지우기는 적은 사람과 관리자만 (store/family.ts · DB 정책 00008)
  const canDelete = useCanDelete();
  const canEdit = useCanEdit();
  const ready = useEventsReady();
  /** 로그인했으면 진짜 가족, 아니면 예시 (store/family.ts) */
  const MEMBERS = useFamilyMembers();
  const CURRENT_USER = useMe();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0~11
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const events = useEventsStore((s) => s.events);
  const addEvent = useEventsStore((s) => s.addEvent);
  const updateEvent = useEventsStore((s) => s.updateEvent);
  const removeEvent = useEventsStore((s) => s.removeEvent);
  const restoreEvent = useEventsStore((s) => s.restoreEvent);

  const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const eventDays = useEventDaysInMonth(ym);
  const eventDots = useEventDotsInMonth(ym);
  const selectedEvents = useEventsOn(selectedDate);

  const [showDetail, setShowDetail] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  /** 수정 중인 일정. null이면 새 일정 */
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  // 폼 입력값
  const [fTitle, setFTitle] = useState('');
  /** 일정 날짜 — 새 일정은 고른 날, 고칠 땐 그 일정의 날. 여기서 바꿀 수 있다 (점검 B8) */
  const [fDate, setFDate] = useState(todayISO());
  const [fTime, setFTime] = useState('');
  /** 며칠짜리 일정 — 켜면 끝나는 날·시각 칸이 나온다 (구글 캘린더처럼) */
  const [fMultiDay, setFMultiDay] = useState(false);
  const [fEndDate, setFEndDate] = useState('');
  const [fEndTime, setFEndTime] = useState('');
  const [fLocation, setFLocation] = useState('');
  /** 장소 칸에 손을 대고 있는 동안만 추천을 펼친다 */
  const [placeFocus, setPlaceFocus] = useState(false);
  const placeSuggestions = usePlaceSuggestions(fLocation);
  const rememberPlace = usePlacesStore((s) => s.remember);
  const forgetPlace = usePlacesStore((s) => s.forget);
  const [fMembers, setFMembers] = useState<string[]>([]);
  const [fMemo, setFMemo] = useState('');
  const [fColor, setFColor] = useState(EVENT_COLORS[0]);

  // 삭제 되돌리기 — 실수로 지워도 10초 안에 살릴 수 있다
  const [undoItem, setUndoItem] = useState<CalendarEvent | null>(null);
  /** 지운 순간의 가족 — 캘린더는 탭이라 가족을 바꿔도 화면이 남는다 (점검 L1) */
  const undoFamily = useRef<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;

  const runOpen = () => {
    Animated.parallel([
      Animated.timing(modalBg, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(modalSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };
  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalBg, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(modalSlide, { toValue: 500, duration: 250, useNativeDriver: true }),
    ]).start(({ finished }) => {
      // 닫히는 도중에 다른 창을 열면(검색에서 바로 넘어오는 등) 이 닫힘은 중간에 끊긴다.
      // 그때 비우면 **방금 연 창까지 닫힌다** — 끝까지 닫혔을 때만 비운다
      if (!finished) return;
      setShowDetail(null); setShowForm(false); setEditing(null);
    });
  };

  // 여는 쪽이 다른 창을 확실히 내린다 — 닫힘이 끊겼을 때 두 창이 겹쳐 보이지 않게
  const openDetail = (event: CalendarEvent) => { setShowForm(false); setEditing(null); setShowDetail(event); runOpen(); };

  const resetForm = () => {
    setFTitle(''); setFTime(''); setFLocation(''); setFMembers([]); setFMemo(''); setFColor(EVENT_COLORS[0]);
    setFMultiDay(false); setFEndDate(''); setFEndTime(''); setPlaceFocus(false);
  };

  /** 새 일정 — 지금 고른 날짜에 넣는다 */
  const openCreate = () => { setShowDetail(null); setEditing(null); resetForm(); setFDate(selectedDate); setShowForm(true); runOpen(); };

  /** 고치기 — 새 일정 폼을 그대로 재사용해 값이 채워진 채로 연다 */
  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setFDate(event.date);
    setFTitle(event.title);
    setFTime(event.time);
    const multi = !!event.endDate && event.endDate > event.date;
    setFMultiDay(multi || !!event.endTime);
    setFEndDate(multi ? event.endDate! : '');
    setFEndTime(event.endTime ?? '');
    setFLocation(event.location ?? '');
    setFMembers(event.members);
    setFMemo(event.memo ?? '');
    setFColor(event.color);
    setShowDetail(null);
    setShowForm(true);
    runOpen();
  };

  const toggleMember = (name: string) =>
    setFMembers((prev) => (prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]));

  const handleSave = () => {
    const title = fTitle.trim();
    if (!title) {
      showAlert('일정 이름을 적어주세요', '무슨 일인지 한 줄만 있으면 충분해요.');
      return;
    }
    const date = parseLooseDate(fDate);
    if (!date) {
      showAlert('날짜를 한 번 봐주세요', '2026.10.3처럼 적거나, 위의 오늘이나 내일 버튼을 눌러주세요.');
      return;
    }
    // "저녁" 같은 말은 시간으로 못 알아듣는다 — 조용히 하루 종일로 바꾸지 말고 물어본다
    if (fTime.trim() && !normalizeTime(fTime)) {
      showAlert('몇 시인지 못 알아들었어요', "'오후 6시'나 '18:00'처럼 적어주세요. 시간이 없으면 비워두면 하루 종일이 돼요.");
      return;
    }
    // 끝나는 날·시각 — 켰을 때만. 시작보다 앞이면 되묻는다
    let endDate: string | undefined;
    let endTime = '';
    if (fMultiDay) {
      if (fEndDate.trim()) {
        const parsed = parseLooseDate(fEndDate);
        if (!parsed) { showAlert('끝나는 날을 한 번 봐주세요', '2026.10.5처럼 적어주세요.'); return; }
        if (parsed < date) { showAlert('끝나는 날이 시작보다 앞이에요', '시작한 날이거나 그 뒤여야 해요.'); return; }
        endDate = parsed > date ? parsed : undefined;
      }
      if (fEndTime.trim()) {
        if (!normalizeTime(fEndTime)) { showAlert('끝나는 시각을 못 알아들었어요', "'오후 8시'나 '20:00'처럼 적어주세요."); return; }
        endTime = normalizeTime(fEndTime);
        if (!endDate && fTime.trim() && endTime < normalizeTime(fTime)) {
          showAlert('끝나는 시각이 시작보다 앞이에요', '같은 날이면 시작 시각 뒤여야 해요.'); return;
        }
      }
    }
    const payload = {
      date,
      time: normalizeTime(fTime),
      endDate,
      endTime,
      title,
      location: fLocation.trim() || undefined,
      members: fMembers,
      memo: fMemo.trim() || undefined,
      color: nameColor(fMembers[0] ?? CURRENT_USER),
      createdBy: editing ? editing.createdBy : CURRENT_USER,
    };
    if (editing) updateEvent(editing.id, payload);
    else addEvent(payload);
    // 장소를 적었으면 자주 가는 곳에 쌓는다 — 다음엔 몇 글자만 쳐도 펼쳐 준다
    if (payload.location) rememberPlace(payload.location);
    // 고른 날짜도 그 일정의 날로 따라간다 — 저장한 게 바로 보이게
    setSelectedDate(date);
    setCurrentYear(Number(date.slice(0, 4)));
    setCurrentMonth(Number(date.slice(5, 7)) - 1);
    closeModal();
    resetForm();
  };

  const handleDelete = (event: CalendarEvent) => {
    showAlert('이 일정을 지울까요?', `'${event.title}'${eulreul(event.title)} 캘린더에서 뺄게요. 바로 되돌릴 수 있어요.`, [
      { text: '그냥 둘게요', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () => {
          removeEvent(event.id);
          closeModal();
          setUndoItem(event);
          undoFamily.current = useEventsStore.getState().familyId;
          if (undoTimer.current) clearTimeout(undoTimer.current);
          undoTimer.current = setTimeout(() => setUndoItem(null), 10000);
        },
      },
    ]);
  };

  const handleUndo = () => {
    if (!undoItem) return;
    if (useEventsStore.getState().familyId !== undoFamily.current) {
      setUndoItem(null);
      showAlert('다른 가족을 보고 있어요', '지운 일정은 그 가족으로 돌아가서만 되돌릴 수 있어요. 이번엔 되돌리지 않았어요.');
      return;
    }
    restoreEvent(undoItem);
    setUndoItem(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  // ── 달력 격자 ──────────────────────────────────────────
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, () => null);

  const dateOf = (day: number) => `${ym}-${String(day).padStart(2, '0')}`;
  const isToday = (day: number) => dateOf(day) === todayISO();
  const isSelected = (day: number) => dateOf(day) === selectedDate;

  /** 달을 옮길 때 고른 날짜도 같은 날짜로 따라간다 (말일을 넘으면 말일로) */
  const goMonth = (delta: number) => {
    const base = new Date(currentYear, currentMonth + delta, 1);
    const y = base.getFullYear();
    const m = base.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    const day = Math.min(Number(selectedDate.slice(8, 10)), last);
    setCurrentYear(y); setCurrentMonth(m);
    setSelectedDate(`${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };
  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayISO());
  };

  const isCurrentMonth = ym === todayISO().slice(0, 7);
  const monthEventCount = events.filter((e) => e.date.startsWith(ym)).length;

  /** 장소를 지도에서 — 앱을 따로 붙이지 않고 지도 앱(웹)에 검색어로 넘긴다 */
  const openMap = (place: string) => {
    const q = encodeURIComponent(place);
    const naver = `https://map.naver.com/p/search/${q}`;
    const google = `https://www.google.com/maps/search/?api=1&query=${q}`;
    showAlert(place, '어느 지도로 볼까요?', [
      { text: '네이버 지도', onPress: () => Linking.openURL(naver).catch(() => {}) },
      { text: '구글 지도', onPress: () => Linking.openURL(google).catch(() => {}) },
      { text: '그냥 둘게요', style: 'cancel' },
    ]);
  };

  /** 상세에 보여줄 '언제' 한 줄 — 하루짜리 / 시간 있는 하루 / 며칠짜리 */
  const whenLine = (e: CalendarEvent) => {
    const multi = !!e.endDate && e.endDate > e.date;
    if (multi) {
      const start = `${formatEventDate(e.date)}${e.time ? ` ${formatTime(e.time)}` : ''}`;
      const end = `${formatEventDate(e.endDate!)}${e.endTime ? ` ${formatTime(e.endTime)}` : ''}`;
      return `${start}부터 ${end}까지`;
    }
    if (!e.time) return `${formatEventDate(e.date)} 하루 종일`;
    return `${formatEventDate(e.date)} ${formatTime(e.time)}${e.endTime ? `부터 ${formatTime(e.endTime)}까지` : ''}`;
  };

  // 통합 검색에서 일정을 누르면 `openId`를 싣고 온다 — 그 날짜로 옮기고 상세를 한 번 연다
  const { openId } = useLocalSearchParams<{ openId?: string }>();
  const router = useRouter();
  const openedFor = useRef('');
  useEffect(() => {
    if (!openId || openedFor.current === openId) return;
    const ev = events.find((e) => e.id === openId);
    if (!ev) return;
    openedFor.current = openId;
    setSelectedDate(ev.date);
    setCurrentYear(Number(ev.date.slice(0, 4)));
    setCurrentMonth(Number(ev.date.slice(5, 7)) - 1);
    openDetail(ev);
    // 캘린더는 탭이라 화면이 남는다. 주소에 openId가 남아 있으면 같은 일정을 다시 눌러도 안 열린다 (점검 L3)
    router.setParams({ openId: undefined } as any);
    openedFor.current = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, events]);

  return (
    <View style={styles.container}>
      <Modal visible={!!showDetail || showForm} transparent statusBarTranslucent animationType="none" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalWrap}>
          <Animated.View style={[styles.modalBgLayer, { opacity: modalBg }]}>
            <Pressable style={{ flex: 1 }} onPress={closeModal} />
          </Animated.View>
          <Animated.View style={[styles.detailModal, { transform: [{ translateY: modalSlide }] }]}>
            <View style={styles.modalHandle} />

            {/* 일정 상세 */}
            {showDetail && (
              <>
                <View style={styles.detailHeader}>
                  <View style={[styles.detailColorDot, { backgroundColor: eventColor(showDetail) }]} />
                  <Text style={styles.detailTitle}>{showDetail.title}</Text>
                  <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
                    <FontAwesome name="times" size={20} color="#4A4A4A" />
                  </TouchableOpacity>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}><FontAwesome name="clock-o" size={15} color="#A39682" /></View>
                  <View>
                    <Text style={styles.detailLabel}>언제</Text>
                    <Text style={styles.detailValue}>{whenLine(showDetail)}</Text>
                  </View>
                </View>
                {!!showDetail.location && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}><FontAwesome name="map-marker" size={15} color="#A39682" /></View>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => openMap(showDetail.location!)}>
                      <Text style={styles.detailLabel}>어디서</Text>
                      <Text style={styles.detailValue}>{showDetail.location}</Text>
                      <Text style={styles.detailMapHint}>눌러서 지도에서 보기</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}><FontAwesome name="users" size={14} color="#A39682" /></View>
                  <View><Text style={styles.detailLabel}>누구랑</Text><Text style={styles.detailValue}>{membersLabel(showDetail.members)}</Text></View>
                </View>
                {!!showDetail.memo && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}><FontAwesome name="sticky-note-o" size={14} color="#A39682" /></View>
                    <View style={{ flex: 1 }}><Text style={styles.detailLabel}>메모</Text><Text style={styles.detailValue}>{showDetail.memo}</Text></View>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}><FontAwesome name="pencil-square-o" size={14} color="#A39682" /></View>
                  <View>
                    <Text style={styles.detailLabel}>적어둔 사람</Text>
                    <Text style={styles.detailValue}>
                      {showDetail.createdBy}{showDetail.createdBy === CURRENT_USER ? ' (나)' : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailActions}>
                  {canEdit(showDetail.authorId) && (
                  <TouchableOpacity style={styles.detailBtn} activeOpacity={0.7} onPress={() => openEdit(showDetail)}>
                    <FontAwesome name="pencil" size={14} color="#2D5A3F" />
                    <Text style={styles.detailBtnText}>고치기</Text>
                  </TouchableOpacity>
                  )}
                  {canDelete(showDetail.authorId) && (
                    <TouchableOpacity style={[styles.detailBtn, styles.detailBtnDanger]} activeOpacity={0.7} onPress={() => handleDelete(showDetail)}>
                      <FontAwesome name="trash-o" size={14} color="#D94040" />
                      <Text style={[styles.detailBtnText, { color: '#D94040' }]}>지우기</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {/* 일정 넣기 / 고치기 — 같은 폼을 재사용한다 */}
            {showForm && (
              <>
                <View style={styles.addHeader}>
                  <Text style={styles.addTitle}>{editing ? '일정 고치기' : '새 일정'}</Text>
                  <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
                    <FontAwesome name="times" size={20} color="#4A4A4A" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.addDate}>{parseLooseDate(fDate) ? formatEventDate(parseLooseDate(fDate)!) : '날짜를 적어주세요'}</Text>

                <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.addLabel}>언제</Text>
                  <View style={styles.chipRow}>
                    {([['고른 날', selectedDate], ['오늘', todayISO()], ['내일', tomorrowISO()]] as const).map(([label, iso]) => (
                      <TouchableOpacity key={label} style={[styles.chip, fDate === iso && styles.chipOn]}
                        activeOpacity={0.7} onPress={() => setFDate(iso)}>
                        <Text style={[styles.chipText, fDate === iso && styles.chipTextOn]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <DateField value={fDate} onChange={setFDate} allowEmpty={false} />

                  <Text style={styles.addLabel}>무슨 일인가요?</Text>
                  <TextInput style={styles.addInput} placeholder="예) 가족 저녁 식사" placeholderTextColor="#A39682"
                    value={fTitle} onChangeText={setFTitle} />

                  <Text style={styles.addLabel}>몇 시에?</Text>
                  <TextInput style={styles.addInput} placeholder="비워두면 하루 종일" placeholderTextColor="#A39682"
                    value={fTime} onChangeText={setFTime} />
                  <View style={styles.chipRow}>
                    {TIME_CHIPS.map((t) => (
                      <TouchableOpacity key={t} style={[styles.chip, fTime === t && styles.chipOn]}
                        activeOpacity={0.7} onPress={() => setFTime(t)}>
                        <Text style={[styles.chipText, fTime === t && styles.chipTextOn]}>{formatTime(t)}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={[styles.chip, !fTime && styles.chipOn]} activeOpacity={0.7} onPress={() => setFTime('')}>
                      <Text style={[styles.chipText, !fTime && styles.chipTextOn]}>하루 종일</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.toggleRow} activeOpacity={0.7} onPress={() => setFMultiDay((v) => !v)}>
                    <FontAwesome name={fMultiDay ? 'check-square' : 'square-o'} size={18} color={fMultiDay ? '#4A8C6F' : '#A39682'} />
                    <Text style={styles.toggleText}>끝나는 날이나 시각도 정할래요</Text>
                  </TouchableOpacity>
                  {fMultiDay && (
                    <View style={styles.endBox}>
                      <Text style={styles.addLabel}>언제 끝나요?</Text>
                      <View style={styles.chipRow}>
                        {([['같은 날', ''], ['다음 날', addDaysISO(parseLooseDate(fDate) ?? todayISO(), 1)], ['이틀 뒤', addDaysISO(parseLooseDate(fDate) ?? todayISO(), 2)]] as const).map(([label, iso]) => (
                          <TouchableOpacity key={label} style={[styles.chip, fEndDate === iso && styles.chipOn]}
                            activeOpacity={0.7} onPress={() => setFEndDate(iso)}>
                            <Text style={[styles.chipText, fEndDate === iso && styles.chipTextOn]}>{label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <DateField value={fEndDate} onChange={setFEndDate} placeholder="비워두면 같은 날에 끝나요" />
                      <Text style={styles.addLabel}>몇 시에 끝나요?</Text>
                      <TextInput style={styles.addInput} placeholder="비워두면 시각은 안 적어요" placeholderTextColor="#A39682"
                        value={fEndTime} onChangeText={setFEndTime} />
                    </View>
                  )}

                  <Text style={styles.addLabel}>어디서?</Text>
                  <View style={styles.placeInputRow}>
                    <TextInput style={[styles.addInput, styles.placeInput]} placeholder="예) 정자동 한강갈비" placeholderTextColor="#A39682"
                      value={fLocation} onChangeText={setFLocation}
                      onFocus={() => setPlaceFocus(true)} onBlur={() => setTimeout(() => setPlaceFocus(false), 150)} />
                    {!!fLocation.trim() && (
                      <TouchableOpacity style={styles.mapBtn} activeOpacity={0.7} onPress={() => openMap(fLocation.trim())} accessibilityLabel="지도에서 보기">
                        <FontAwesome name="map-o" size={15} color="#2D5A3F" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {placeFocus && placeSuggestions.length > 0 && (
                    <View style={styles.suggestBox}>
                      <Text style={styles.suggestTitle}>{fLocation.trim() ? '이곳 아닌가요?' : '자주 가는 곳'}</Text>
                      {placeSuggestions.map((p) => (
                        <View key={p.id} style={styles.suggestRow}>
                          <TouchableOpacity style={styles.suggestMain} activeOpacity={0.7}
                            onPress={() => { setFLocation(p.name); setPlaceFocus(false); }}>
                            <FontAwesome name="map-marker" size={13} color="#7A6B55" />
                            <Text style={styles.suggestText}>{p.name}</Text>
                            {p.useCount > 1 && <Text style={styles.suggestCount}>{p.useCount}번</Text>}
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.suggestX} activeOpacity={0.7} onPress={() => forgetPlace(p.id)} accessibilityLabel={`${p.name} 목록에서 빼기`}>
                            <FontAwesome name="times" size={12} color="#A39682" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.addLabel}>누구랑? 안 고르면 가족 모두예요</Text>
                  <View style={styles.chipRow}>
                    {MEMBERS.map((m) => {
                      const on = fMembers.includes(m);
                      return (
                        <TouchableOpacity key={m} style={[styles.chip, on && styles.chipOn]} activeOpacity={0.7} onPress={() => toggleMember(m)}>
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{m}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.addLabel}>메모</Text>
                  <TextInput style={[styles.addInput, { minHeight: 80, textAlignVertical: 'top' }]}
                    placeholder="챙길 것이나 기억하고 싶은 것" placeholderTextColor="#A39682"
                    value={fMemo} onChangeText={setFMemo} multiline numberOfLines={3} />

                  <TouchableOpacity style={styles.addSubmit} activeOpacity={0.8} onPress={handleSave}>
                    <Text style={styles.addSubmitText}>{editing ? '고친 내용 저장' : '캘린더에 넣기'}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => goMonth(-1)} style={styles.navButton} activeOpacity={0.7}>
            <FontAwesome name="chevron-left" size={16} color="#4A4A4A" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} activeOpacity={0.7} style={{ alignItems: 'center' }}>
            <Text style={styles.monthTitle}>{currentYear}년 {currentMonth + 1}월</Text>
            <Text style={styles.monthSub}>
              {monthEventCount > 0 ? `일정 ${monthEventCount}개` : '아직 비어 있어요'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goMonth(1)} style={styles.navButton} activeOpacity={0.7}>
            <FontAwesome name="chevron-right" size={16} color="#4A4A4A" />
          </TouchableOpacity>
        </View>

        {!isCurrentMonth && (
          <TouchableOpacity style={styles.todayChip} onPress={goToToday} activeOpacity={0.7}>
            <FontAwesome name="calendar-check-o" size={12} color="#2D5A3F" />
            <Text style={styles.todayChipText}>오늘로 돌아가기</Text>
          </TouchableOpacity>
        )}

        <View style={styles.weekHeader}>
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <Text key={d} style={[styles.weekDay, i === 0 && styles.sundayColor, i === 6 && styles.saturdayColor]}>{d}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {blanks.map((_, i) => <View key={`b-${i}`} style={styles.dayCell} />)}
          {days.map((day) => {
            const dow = (firstDay + day - 1) % 7;
            const todayCell = isToday(day);
            const selected = isSelected(day);
            return (
              <TouchableOpacity key={day}
                style={[styles.dayCell, todayCell && styles.todayCell, selected && !todayCell && styles.selectedCell]}
                onPress={() => setSelectedDate(dateOf(day))} activeOpacity={0.6}>
                <Text style={[
                  styles.dayText,
                  !todayCell && dow === 0 && styles.sundayColor,
                  !todayCell && dow === 6 && styles.saturdayColor,
                  todayCell && styles.todayText,
                  selected && !todayCell && styles.selectedText,
                ]}>{day}</Text>
                {eventDays.has(dateOf(day)) && (
                  <View style={styles.dotRow}>
                    {(eventDots.get(dateOf(day)) ?? ['#4A8C6F']).map((c) => (
                      <View key={c} style={[styles.eventIndicator, { backgroundColor: c }, todayCell && styles.eventIndicatorToday]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedDate === todayISO() ? '오늘, ' : ''}{formatEventDate(selectedDate)}
          </Text>
          {selectedEvents.length === 0 && !ready ? (
            <LoadingRows label="일정을 살펴보고 있어요" />
          ) : selectedEvents.length === 0 ? (
            <TouchableOpacity style={styles.emptyState} activeOpacity={0.7} onPress={openCreate}>
              <FontAwesome name="calendar-plus-o" size={32} color="#D6CDBF" />
              <Text style={styles.emptyText}>아직 적어둔 일정이 없어요</Text>
              <Text style={styles.emptySubtext}>여기를 눌러 하나 적어볼까요?</Text>
            </TouchableOpacity>
          ) : (
            selectedEvents.map((ev) => (
              <TouchableOpacity key={ev.id} style={styles.eventCard} activeOpacity={0.7} onPress={() => openDetail(ev)}>
                <View style={[styles.eventColorBar, { backgroundColor: eventColor(ev) }]} />
                <View style={styles.eventContent}>
                  <Text style={styles.eventTime}>
                    {dayIndexOf(ev, selectedDate)
                      ? `${dayIndexOf(ev, selectedDate)!.total}일 중 ${dayIndexOf(ev, selectedDate)!.nth}째 날`
                      : `${formatTime(ev.time)}${ev.endTime ? `부터 ${formatTime(ev.endTime)}까지` : ''}`}
                  </Text>
                  <Text style={styles.eventName}>{ev.title}</Text>
                  <View style={styles.eventMetaRow}>
                    {!!ev.location && (
                      <View style={styles.eventLocRow}>
                        <FontAwesome name="map-marker" size={11} color="#7A6B55" />
                        <Text style={styles.eventLoc}>{ev.location}</Text>
                      </View>
                    )}
                    <View style={styles.memberTag}>
                      <Text style={styles.memberTagText}>{membersLabel(ev.members)}</Text>
                    </View>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={12} color="#D6CDBF" />
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* 삭제 되돌리기 */}
      {undoItem && (
        <View style={styles.undoBar}>
          <Text style={styles.undoText} numberOfLines={1}>'{undoItem.title}' 지웠어요</Text>
          <TouchableOpacity style={styles.undoBtn} activeOpacity={0.7} onPress={handleUndo}>
            <FontAwesome name="undo" size={12} color="#FFFFFF" />
            <Text style={styles.undoBtnText}>되돌리기</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.fab} accessibilityLabel="새로 적기" activeOpacity={0.8} onPress={openCreate}>
        <FontAwesome name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  navButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EDE8DF' },
  monthTitle: { fontSize: 20, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  monthSub: { fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard', marginTop: 2 },
  todayChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, backgroundColor: '#EFF6F1', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginBottom: 8 },
  todayChipText: { fontSize: 12, fontWeight: '600', color: '#2D5A3F', fontFamily: 'Pretendard' },
  weekHeader: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#7A6B55', fontFamily: 'Pretendard' },
  sundayColor: { color: '#C25A5A' },
  saturdayColor: { color: '#4A90C8' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 16 },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' as const },
  todayCell: { backgroundColor: '#4A8C6F', borderRadius: 20 },
  selectedCell: { backgroundColor: '#EFF6F1', borderRadius: 20 },
  dayText: { fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard' },
  todayText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'PretendardBold' },
  selectedText: { color: '#2D5A3F', fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 3, position: 'absolute' as const, bottom: '14%' },
  eventIndicator: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#4A8C6F' },
  eventIndicatorToday: { backgroundColor: '#FFFFFF' },

  aiCalHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginBottom: 16, backgroundColor: '#EFF6F1', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#D8E8DE' },
  aiCalHintText: { flex: 1, fontSize: 12, color: '#2D5A3F', lineHeight: 18, fontFamily: 'Pretendard' },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', marginBottom: 12, fontFamily: 'PretendardBold' },
  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE8DF' },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#7A6B55', marginTop: 12, fontFamily: 'Pretendard' },
  emptySubtext: { fontSize: 13, color: '#7A6B55', marginTop: 4, fontFamily: 'Pretendard' },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EDE8DF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  eventColorBar: { width: 4, height: 48, borderRadius: 2 },
  eventContent: { flex: 1 },
  eventTime: { fontSize: 12, color: '#7A6B55', fontWeight: '600', marginBottom: 2, fontFamily: 'Pretendard' },
  eventName: { fontSize: 15, fontWeight: '600', color: '#1F1F1F', fontFamily: 'Pretendard' },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' },
  eventLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventLoc: { fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard' },
  memberTag: { backgroundColor: '#F4F0E8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  memberTagText: { fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard' },

  undoBar: {
    position: 'absolute', bottom: 20, left: 20, right: 88, zIndex: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    backgroundColor: '#2D2A26', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
  },
  undoText: { flex: 1, fontSize: 13, color: '#F4F0E8', fontFamily: 'Pretendard' },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  undoBtnText: { fontSize: 13, color: '#FFFFFF', fontFamily: 'PretendardBold' },

  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4A8C6F', justifyContent: 'center', alignItems: 'center', shadowColor: '#4A8C6F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBgLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalHandle: { width: 36, height: 4, backgroundColor: '#D6CDBF', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 12 },
  detailModal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  detailColorDot: { width: 12, height: 12, borderRadius: 6 },
  detailTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  detailIconBox: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  detailLabel: { fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard', marginBottom: 2 },
  detailValue: { fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard' },
  aiHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6F1', borderRadius: 12, padding: 14, marginVertical: 12 },
  aiHintText: { flex: 1, fontSize: 13, color: '#2D5A3F', lineHeight: 20, fontFamily: 'Pretendard' },
  detailActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  detailBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#EFF6F1' },
  detailBtnText: { fontSize: 14, fontWeight: '600', color: '#2D5A3F', fontFamily: 'Pretendard' },
  detailBtnDanger: { backgroundColor: '#FFF0F0' },

  addHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  addTitle: { fontSize: 20, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  addDate: { fontSize: 14, color: '#7A6B55', marginBottom: 16, fontFamily: 'Pretendard' },
  addLabel: { fontSize: 13, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, fontFamily: 'Pretendard' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, marginBottom: 12 },
  toggleText: { fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard' },
  endBox: { backgroundColor: '#F4F0E8', borderRadius: 12, padding: 12, marginBottom: 12 },
  placeInputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  placeInput: { flex: 1 },
  mapBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#EFF6F1', alignItems: 'center', justifyContent: 'center' },
  suggestBox: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 12, paddingVertical: 6, marginTop: -6, marginBottom: 14 },
  suggestTitle: { fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard', paddingHorizontal: 14, paddingVertical: 4 },
  suggestRow: { flexDirection: 'row', alignItems: 'center' },
  suggestMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  suggestText: { flex: 1, fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard' },
  suggestCount: { fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard' },
  suggestX: { paddingHorizontal: 14, paddingVertical: 10 },
  detailMapHint: { fontSize: 12, color: '#4A8C6F', fontFamily: 'Pretendard', marginTop: 2 },
  eventDayIndex: { fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard', marginBottom: 2 },
  addInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F1F1F', marginBottom: 12, fontFamily: 'Pretendard' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, backgroundColor: '#F4F0E8', borderWidth: 1, borderColor: '#EDE8DF' },
  chipOn: { backgroundColor: '#EFF6F1', borderColor: '#4A8C6F' },
  chipText: { fontSize: 13, color: '#7A6B55', fontFamily: 'Pretendard' },
  chipTextOn: { color: '#2D5A3F', fontWeight: '700' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  colorDotOn: { borderWidth: 2, borderColor: '#1F1F1F' },
  addSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  addSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
});
