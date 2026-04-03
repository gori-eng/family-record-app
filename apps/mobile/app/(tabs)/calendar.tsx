import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';

const MOCK_EVENTS: Record<string, { time: string; title: string; color: string; location?: string }[]> = {
  '2026-4-2': [
    { time: '14:00', title: '학교 발표회', color: '#4A90C8', location: '서현초등학교' },
    { time: '18:00', title: '가족 저녁 식사', color: '#C85A4A', location: '정자동 한강갈비' },
  ],
  '2026-4-5': [
    { time: '10:00', title: '서준이 수영 수업', color: '#4A90C8' },
  ],
  '2026-4-10': [
    { time: '09:00', title: '지우 유치원 소풍', color: '#4AA86B', location: '에버랜드' },
  ],
  '2026-4-15': [
    { time: '19:00', title: '부모님 결혼기념일', color: '#C85A4A' },
  ],
  '2026-4-22': [
    { time: '11:00', title: '가족 사진 촬영', color: '#9C27B0', location: '분당 중앙공원' },
    { time: '17:00', title: '지우 소아과 정기검진', color: '#E6A817' },
  ],
};

export default function CalendarScreen() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, () => null);

  const isToday = (day: number) =>
    currentYear === today.getFullYear() &&
    currentMonth === today.getMonth() &&
    day === today.getDate();

  const getEventsForDay = (day: number) => {
    const key = `${currentYear}-${currentMonth + 1}-${day}`;
    return MOCK_EVENTS[key] || [];
  };

  const hasEvents = (day: number) => getEventsForDay(day).length > 0;

  const selectedEvents = getEventsForDay(selectedDay);

  const goToPrevMonth = () => {
    const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const maxDay = new Date(newYear, newMonth + 1, 0).getDate();
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
    setSelectedDay(Math.min(selectedDay, maxDay));
  };

  const goToNextMonth = () => {
    const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const maxDay = new Date(newYear, newMonth + 1, 0).getDate();
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
    setSelectedDay(Math.min(selectedDay, maxDay));
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
            <FontAwesome name="chevron-left" size={16} color="#5C4A32" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.monthTitle}>
              {currentYear}년 {currentMonth + 1}월
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <FontAwesome name="chevron-right" size={16} color="#5C4A32" />
          </TouchableOpacity>
        </View>

        {!isCurrentMonth && (
          <TouchableOpacity style={styles.todayChip} onPress={goToToday}>
            <FontAwesome name="calendar-check-o" size={12} color="#C85A4A" />
            <Text style={styles.todayChipText}>오늘로 이동</Text>
          </TouchableOpacity>
        )}

        {/* Week Header */}
        <View style={styles.weekHeader}>
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <Text key={d} style={[styles.weekDay, i === 0 && styles.sundayText, i === 6 && styles.saturdayText]}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {blanks.map((_, i) => (
            <View key={`blank-${i}`} style={styles.dayCell} />
          ))}
          {days.map((day) => {
            const dayOfWeek = (firstDay + day - 1) % 7;
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  isToday(day) && styles.todayCell,
                  selectedDay === day && !isToday(day) && styles.selectedCell,
                ]}
                onPress={() => setSelectedDay(day)}
                activeOpacity={0.6}
              >
                <Text style={[
                  styles.dayText,
                  isToday(day) && styles.todayText,
                  selectedDay === day && !isToday(day) && styles.selectedText,
                  dayOfWeek === 0 && styles.sundayText,
                  dayOfWeek === 6 && styles.saturdayText,
                ]}>
                  {day}
                </Text>
                {hasEvents(day) && (
                  <View style={[styles.eventIndicator, isToday(day) && styles.eventIndicatorToday]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {currentMonth + 1}월 {selectedDay}일 {isToday(selectedDay) ? '(오늘)' : ''} 일정
          </Text>

          {selectedEvents.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyState}
              activeOpacity={0.7}
              onPress={() => Alert.alert('일정 추가', '새 일정 등록 기능이 곧 추가됩니다.')}
            >
              <FontAwesome name="calendar-o" size={32} color="#E0D8C8" />
              <Text style={styles.emptyText}>등록된 일정이 없어요</Text>
              <Text style={styles.emptySubtext}>탭하여 일정을 추가해보세요</Text>
            </TouchableOpacity>
          ) : (
            selectedEvents.map((event, i) => (
              <TouchableOpacity
                key={i}
                style={styles.eventCard}
                activeOpacity={0.7}
                onPress={() => Alert.alert(
                  event.title,
                  `시간: ${event.time}${event.location ? `\n장소: ${event.location}` : ''}\n\n일정 상세 보기 기능이 곧 추가됩니다.`
                )}
              >
                <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />
                <View style={styles.eventContent}>
                  <Text style={styles.eventTime}>{event.time}</Text>
                  <Text style={styles.eventName}>{event.title}</Text>
                  {event.location && (
                    <View style={styles.eventLocationRow}>
                      <FontAwesome name="map-marker" size={11} color="#BFAE99" />
                      <Text style={styles.eventLocation}>{event.location}</Text>
                    </View>
                  )}
                </View>
                <FontAwesome name="chevron-right" size={12} color="#BFAE99" />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => Alert.alert('일정 추가', '새 일정 등록 기능이 곧 추가됩니다.')}
      >
        <FontAwesome name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  monthNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  navButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  monthTitle: { fontSize: 20, fontWeight: '700', color: '#2D2D2D' },
  todayChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6,
    backgroundColor: '#FFF0ED', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    marginBottom: 8,
  },
  todayChipText: { fontSize: 12, fontWeight: '600', color: '#C85A4A' },
  weekHeader: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#BFAE99' },
  sundayText: { color: '#C85A4A' },
  saturdayText: { color: '#4A90C8' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 24 },
  dayCell: {
    width: `${100 / 7}%`, aspectRatio: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  todayCell: { backgroundColor: '#C85A4A', borderRadius: 20 },
  selectedCell: { backgroundColor: '#FFF0ED', borderRadius: 20 },
  dayText: { fontSize: 15, color: '#2D2D2D' },
  todayText: { color: '#FFFFFF', fontWeight: '700' },
  selectedText: { color: '#C85A4A', fontWeight: '700' },
  eventIndicator: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: '#C85A4A', marginTop: 2,
  },
  eventIndicatorToday: { backgroundColor: '#FFFFFF' },
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#BFAE99', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#D4C8B0', marginTop: 4 },
  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  eventColorBar: { width: 4, height: 40, borderRadius: 2 },
  eventContent: { flex: 1 },
  eventTime: { fontSize: 12, color: '#BFAE99', fontWeight: '600', marginBottom: 2 },
  eventName: { fontSize: 15, fontWeight: '600', color: '#2D2D2D' },
  eventLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  eventLocation: { fontSize: 12, color: '#BFAE99' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#C85A4A', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#C85A4A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
});
