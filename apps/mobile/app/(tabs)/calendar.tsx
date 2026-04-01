import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function CalendarScreen() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, () => null);

  return (
    <View style={styles.container}>
      <Text style={styles.monthTitle}>
        {year}년 {month + 1}월
      </Text>

      <View style={styles.weekHeader}>
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {blanks.map((_, i) => (
          <View key={`blank-${i}`} style={styles.dayCell} />
        ))}
        {days.map((day) => (
          <View
            key={day}
            style={[styles.dayCell, day === today.getDate() && styles.todayCell]}
          >
            <Text style={[styles.dayText, day === today.getDate() && styles.todayText]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>오늘의 일정</Text>
        <View style={styles.eventCard}>
          <View style={[styles.eventDot, { backgroundColor: '#C85A4A' }]} />
          <View>
            <Text style={styles.eventTime}>18:00</Text>
            <Text style={styles.eventName}>가족 저녁 식사</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0', padding: 20 },
  monthTitle: { fontSize: 20, fontWeight: '700', color: '#2D2D2D', textAlign: 'center', marginBottom: 16 },
  weekHeader: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#BFAE99' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  dayCell: {
    width: `${100 / 7}%`, aspectRatio: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  todayCell: { backgroundColor: '#C85A4A', borderRadius: 20 },
  dayText: { fontSize: 15, color: '#2D2D2D' },
  todayText: { color: '#FFFFFF', fontWeight: '700' },
  section: {},
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginBottom: 12 },
  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventTime: { fontSize: 12, color: '#BFAE99', fontWeight: '600' },
  eventName: { fontSize: 15, fontWeight: '600', color: '#2D2D2D' },
});
