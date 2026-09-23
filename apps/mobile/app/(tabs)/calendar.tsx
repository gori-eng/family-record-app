import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, Animated, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { showAlert } from '../../components/AppAlert';
import { MEMBERS, CURRENT_USER } from '../../constants/family';
import {
  useEventsStore, useEventsOn, useEventDaysInMonth,
  EVENT_COLORS, formatTime, formatEventDate, membersLabel, normalizeTime, todayISO,
  type CalendarEvent,
} from '../../store/events';

/** 시간 입력을 한 번에 채우는 버튼 — 자주 쓰는 시간대 */
const TIME_CHIPS = ['09:00', '12:00', '15:00', '18:00', '20:00'];

export default function CalendarScreen() {
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
  const selectedEvents = useEventsOn(selectedDate);

  const [showDetail, setShowDetail] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  /** 수정 중인 일정. null이면 새 일정 */
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  // 폼 입력값
  const [fTitle, setFTitle] = useState('');
  const [fTime, setFTime] = useState('');
  const [fLocation, setFLocation] = useState('');
  const [fMembers, setFMembers] = useState<string[]>([]);
  const [fMemo, setFMemo] = useState('');
  const [fColor, setFColor] = useState(EVENT_COLORS[0]);

  // 삭제 되돌리기 — 실수로 지워도 10초 안에 살릴 수 있다
  const [undoItem, setUndoItem] = useState<CalendarEvent | null>(null);
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
    ]).start(() => { setShowDetail(null); setShowForm(false); setEditing(null); });
  };

  const openDetail = (event: CalendarEvent) => { setShowDetail(event); runOpen(); };

  const resetForm = () => {
    setFTitle(''); setFTime(''); setFLocation(''); setFMembers([]); setFMemo(''); setFColor(EVENT_COLORS[0]);
  };

  /** 새 일정 — 지금 고른 날짜에 넣는다 */
  const openCreate = () => { setEditing(null); resetForm(); setShowForm(true); runOpen(); };

  /** 고치기 — 새 일정 폼을 그대로 재사용해 값이 채워진 채로 연다 */
  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setFTitle(event.title);
    setFTime(event.time);
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
    const payload = {
      date: editing ? editing.date : selectedDate,
      time: normalizeTime(fTime),
      title,
      location: fLocation.trim() || undefined,
      members: fMembers,
      memo: fMemo.trim() || undefined,
      color: fColor,
      createdBy: editing ? editing.createdBy : CURRENT_USER,
    };
    if (editing) updateEvent(editing.id, payload);
    else addEvent(payload);
    closeModal();
    resetForm();
  };

  const handleDelete = (event: CalendarEvent) => {
    showAlert('이 일정을 지울까요?', `'${event.title}'을 캘린더에서 뺍니다. 바로 되돌릴 수 있어요.`, [
      { text: '그냥 둘게요', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () => {
          removeEvent(event.id);
          closeModal();
          setUndoItem(event);
          if (undoTimer.current) clearTimeout(undoTimer.current);
          undoTimer.current = setTimeout(() => setUndoItem(null), 10000);
        },
      },
    ]);
  };

  const handleUndo = () => {
    if (!undoItem) return;
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

  return (
    <View style={styles.container}>
      <Modal visible={!!showDetail || showForm} transparent statusBarTranslucent animationType="none">
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
                  <View style={[styles.detailColorDot, { backgroundColor: showDetail.color }]} />
                  <Text style={styles.detailTitle}>{showDetail.title}</Text>
                  <TouchableOpacity onPress={closeModal} activeOpacity={0.7}>
                    <FontAwesome name="times" size={20} color="#4A4A4A" />
                  </TouchableOpacity>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}><FontAwesome name="clock-o" size={15} color="#A0A0A0" /></View>
                  <View>
                    <Text style={styles.detailLabel}>언제</Text>
                    <Text style={styles.detailValue}>
                      {formatEventDate(showDetail.date)} · {formatTime(showDetail.time)}
                    </Text>
                  </View>
                </View>
                {!!showDetail.location && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}><FontAwesome name="map-marker" size={15} color="#A0A0A0" /></View>
                    <View><Text style={styles.detailLabel}>어디서</Text><Text style={styles.detailValue}>{showDetail.location}</Text></View>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}><FontAwesome name="users" size={14} color="#A0A0A0" /></View>
                  <View><Text style={styles.detailLabel}>누구랑</Text><Text style={styles.detailValue}>{membersLabel(showDetail.members)}</Text></View>
                </View>
                {!!showDetail.memo && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}><FontAwesome name="sticky-note-o" size={14} color="#A0A0A0" /></View>
                    <View style={{ flex: 1 }}><Text style={styles.detailLabel}>메모</Text><Text style={styles.detailValue}>{showDetail.memo}</Text></View>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}><FontAwesome name="pencil-square-o" size={14} color="#A0A0A0" /></View>
                  <View>
                    <Text style={styles.detailLabel}>적어둔 사람</Text>
                    <Text style={styles.detailValue}>
                      {showDetail.createdBy}{showDetail.createdBy === CURRENT_USER ? ' (나)' : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.aiHint}>
                  <FontAwesome name="magic" size={12} color="#2D5A3F" />
                  <Text style={styles.aiHintText}>
                    {showDetail.location
                      ? `"${showDetail.location}" 근처 갈 만한 곳도 찾아드릴까요?`
                      : '가족에게 이 일정을 알려드릴까요?'}
                  </Text>
                </View>

                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.detailBtn} activeOpacity={0.7} onPress={() => openEdit(showDetail)}>
                    <FontAwesome name="pencil" size={14} color="#2D5A3F" />
                    <Text style={styles.detailBtnText}>고치기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.detailBtn, styles.detailBtnDanger]} activeOpacity={0.7} onPress={() => handleDelete(showDetail)}>
                    <FontAwesome name="trash-o" size={14} color="#D94040" />
                    <Text style={[styles.detailBtnText, { color: '#D94040' }]}>지우기</Text>
                  </TouchableOpacity>
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
                <Text style={styles.addDate}>{formatEventDate(editing ? editing.date : selectedDate)}</Text>

                <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                  <Text style={styles.addLabel}>무슨 일인가요</Text>
                  <TextInput style={styles.addInput} placeholder="예: 가족 저녁 식사" placeholderTextColor="#A0A0A0"
                    value={fTitle} onChangeText={setFTitle} />

                  <Text style={styles.addLabel}>몇 시에</Text>
                  <TextInput style={styles.addInput} placeholder="비워두면 하루 종일" placeholderTextColor="#A0A0A0"
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

                  <Text style={styles.addLabel}>어디서 (없으면 비워두세요)</Text>
                  <TextInput style={styles.addInput} placeholder="예: 정자동 한강갈비" placeholderTextColor="#A0A0A0"
                    value={fLocation} onChangeText={setFLocation} />

                  <Text style={styles.addLabel}>누구랑 (안 고르면 가족 전체)</Text>
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

                  <Text style={styles.addLabel}>색</Text>
                  <View style={styles.colorRow}>
                    {EVENT_COLORS.map((c) => (
                      <TouchableOpacity key={c} activeOpacity={0.7} onPress={() => setFColor(c)}
                        style={[styles.colorDot, { backgroundColor: c }, fColor === c && styles.colorDotOn]}>
                        {fColor === c && <FontAwesome name="check" size={12} color="#FFFFFF" />}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.addLabel}>메모 (선택)</Text>
                  <TextInput style={[styles.addInput, { minHeight: 80, textAlignVertical: 'top' }]}
                    placeholder="챙길 것, 만날 사람, 기억하고 싶은 것" placeholderTextColor="#A0A0A0"
                    value={fMemo} onChangeText={setFMemo} multiline numberOfLines={3} />

                  <TouchableOpacity style={styles.addSubmit} activeOpacity={0.8} onPress={handleSave}>
                    <Text style={styles.addSubmitText}>{editing ? '고친 내용 저장' : '캘린더에 넣기'}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </Animated.View>
        </View>
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
                  <View style={[styles.eventIndicator, todayCell && styles.eventIndicatorToday]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.aiCalHint}>
          <FontAwesome name="magic" size={12} color="#2D5A3F" />
          <Text style={styles.aiCalHintText}>
            {selectedEvents.length > 0
              ? `이 날 일정이 ${selectedEvents.length}개예요. 이동 시간까지 생각하면 조금 여유 있게 나서면 좋겠어요.`
              : '이 날은 비어 있어요. 가족이 함께할 일을 하나 적어볼까요?'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {formatEventDate(selectedDate)}{selectedDate === todayISO() ? ' · 오늘' : ''}
          </Text>
          {selectedEvents.length === 0 ? (
            <TouchableOpacity style={styles.emptyState} activeOpacity={0.7} onPress={openCreate}>
              <FontAwesome name="calendar-plus-o" size={32} color="#D4C8B0" />
              <Text style={styles.emptyText}>아직 적어둔 일정이 없어요</Text>
              <Text style={styles.emptySubtext}>눌러서 하나 넣어보세요</Text>
            </TouchableOpacity>
          ) : (
            selectedEvents.map((ev) => (
              <TouchableOpacity key={ev.id} style={styles.eventCard} activeOpacity={0.7} onPress={() => openDetail(ev)}>
                <View style={[styles.eventColorBar, { backgroundColor: ev.color }]} />
                <View style={styles.eventContent}>
                  <Text style={styles.eventTime}>{formatTime(ev.time)}</Text>
                  <Text style={styles.eventName}>{ev.title}</Text>
                  <View style={styles.eventMetaRow}>
                    {!!ev.location && (
                      <View style={styles.eventLocRow}>
                        <FontAwesome name="map-marker" size={11} color="#9C8B75" />
                        <Text style={styles.eventLoc}>{ev.location}</Text>
                      </View>
                    )}
                    <View style={styles.memberTag}>
                      <Text style={styles.memberTagText}>{membersLabel(ev.members)}</Text>
                    </View>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
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

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openCreate}>
        <FontAwesome name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  navButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA' },
  monthTitle: { fontSize: 20, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  monthSub: { fontSize: 12, color: '#888', fontFamily: 'Pretendard', marginTop: 2 },
  todayChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, backgroundColor: '#EFF6F1', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginBottom: 8 },
  todayChipText: { fontSize: 12, fontWeight: '600', color: '#2D5A3F', fontFamily: 'Pretendard' },
  weekHeader: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#9C8B75', fontFamily: 'Pretendard' },
  sundayColor: { color: '#4A8C6F' },
  saturdayColor: { color: '#4A90C8' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 16 },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' as const },
  todayCell: { backgroundColor: '#4A8C6F', borderRadius: 20 },
  selectedCell: { backgroundColor: '#EFF6F1', borderRadius: 20 },
  dayText: { fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard' },
  todayText: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'PretendardBold' },
  selectedText: { color: '#2D5A3F', fontWeight: '700' },
  eventIndicator: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#4A8C6F', position: 'absolute' as const, bottom: '15%' },
  eventIndicatorToday: { backgroundColor: '#FFFFFF' },

  aiCalHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginBottom: 16, backgroundColor: '#EFF6F1', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#D8E8DE' },
  aiCalHintText: { flex: 1, fontSize: 12, color: '#2D5A3F', lineHeight: 18, fontFamily: 'Pretendard' },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', marginBottom: 12, fontFamily: 'PretendardBold' },
  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EAEAEA' },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#7A6B55', marginTop: 12, fontFamily: 'Pretendard' },
  emptySubtext: { fontSize: 13, color: '#9C8B75', marginTop: 4, fontFamily: 'Pretendard' },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  eventColorBar: { width: 4, height: 48, borderRadius: 2 },
  eventContent: { flex: 1 },
  eventTime: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 2, fontFamily: 'Pretendard' },
  eventName: { fontSize: 15, fontWeight: '600', color: '#1F1F1F', fontFamily: 'Pretendard' },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' },
  eventLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventLoc: { fontSize: 12, color: '#9C8B75', fontFamily: 'Pretendard' },
  memberTag: { backgroundColor: '#F4F2EE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  memberTagText: { fontSize: 11, color: '#7A6B55', fontFamily: 'Pretendard' },

  undoBar: {
    position: 'absolute', bottom: 20, left: 20, right: 88, zIndex: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    backgroundColor: '#2D2A26', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
  },
  undoText: { flex: 1, fontSize: 13, color: '#F4F2EE', fontFamily: 'Pretendard' },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  undoBtnText: { fontSize: 13, color: '#FFFFFF', fontFamily: 'PretendardBold' },

  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4A8C6F', justifyContent: 'center', alignItems: 'center', shadowColor: '#4A8C6F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBgLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalHandle: { width: 36, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 12 },
  detailModal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  detailColorDot: { width: 12, height: 12, borderRadius: 6 },
  detailTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  detailIconBox: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  detailLabel: { fontSize: 12, color: '#A0A0A0', fontFamily: 'Pretendard', marginBottom: 2 },
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
  addInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F1F1F', marginBottom: 12, fontFamily: 'Pretendard' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#F4F2EE', borderWidth: 1, borderColor: '#EAEAEA' },
  chipOn: { backgroundColor: '#EFF6F1', borderColor: '#4A8C6F' },
  chipText: { fontSize: 13, color: '#7A6B55', fontFamily: 'Pretendard' },
  chipTextOn: { color: '#2D5A3F', fontWeight: '700' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorDot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  colorDotOn: { borderWidth: 2, borderColor: '#1F1F1F' },
  addSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  addSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
});
