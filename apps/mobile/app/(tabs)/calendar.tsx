import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';

const MOCK_EVENTS: Record<string, { time: string; title: string; color: string; location?: string; member?: string }[]> = {
  '2026-4-2': [
    { time: '14:00', title: '학교 발표회', color: '#4A90C8', location: '서현초등학교', member: '서준' },
    { time: '18:00', title: '가족 저녁 식사', color: '#C05A4E', location: '정자동 한강갈비', member: '전체' },
  ],
  '2026-4-5': [{ time: '10:00', title: '서준이 수영 수업', color: '#4A90C8', member: '서준' }],
  '2026-4-10': [{ time: '09:00', title: '지우 유치원 소풍', color: '#4AA86B', location: '에버랜드', member: '지우' }],
  '2026-4-15': [{ time: '19:00', title: '부모님 결혼기념일', color: '#C05A4E', member: '전체' }],
  '2026-4-22': [
    { time: '11:00', title: '가족 사진 촬영', color: '#9C27B0', location: '분당 중앙공원', member: '전체' },
    { time: '17:00', title: '지우 소아과 정기검진', color: '#E6A817', member: '지우' },
  ],
};

type EventType = { time: string; title: string; color: string; location?: string; member?: string };

export default function CalendarScreen() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showDetail, setShowDetail] = useState<EventType | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, () => null);

  const isToday = (day: number) =>
    currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate();

  const getEventsForDay = (day: number) => {
    const key = `${currentYear}-${currentMonth + 1}-${day}`;
    return MOCK_EVENTS[key] || [];
  };

  const hasEvents = (day: number) => getEventsForDay(day).length > 0;
  const selectedEvents = getEventsForDay(selectedDay);

  const goToPrevMonth = () => {
    const m = currentMonth === 0 ? 11 : currentMonth - 1;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    setCurrentYear(y); setCurrentMonth(m);
    setSelectedDay(Math.min(selectedDay, new Date(y, m + 1, 0).getDate()));
  };
  const goToNextMonth = () => {
    const m = currentMonth === 11 ? 0 : currentMonth + 1;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    setCurrentYear(y); setCurrentMonth(m);
    setSelectedDay(Math.min(selectedDay, new Date(y, m + 1, 0).getDate()));
  };
  const goToToday = () => {
    setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()); setSelectedDay(today.getDate());
  };

  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();

  return (
    <View style={styles.container}>
      {/* Event Detail Modal */}
      <Modal visible={!!showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            {showDetail && (
              <>
                <View style={styles.detailHeader}>
                  <View style={[styles.detailColorDot, { backgroundColor: showDetail.color }]} />
                  <Text style={styles.detailTitle}>{showDetail.title}</Text>
                  <TouchableOpacity onPress={() => setShowDetail(null)} activeOpacity={0.7}>
                    <FontAwesome name="times" size={20} color="#5C4A32" />
                  </TouchableOpacity>
                </View>
                <View style={styles.detailRow}>
                  <FontAwesome name="clock-o" size={16} color="#9C8B75" />
                  <Text style={styles.detailText}>{currentMonth + 1}월 {selectedDay}일 {showDetail.time}</Text>
                </View>
                {showDetail.location && (
                  <View style={styles.detailRow}>
                    <FontAwesome name="map-marker" size={16} color="#9C8B75" />
                    <Text style={styles.detailText}>{showDetail.location}</Text>
                  </View>
                )}
                {showDetail.member && (
                  <View style={styles.detailRow}>
                    <FontAwesome name="user" size={16} color="#9C8B75" />
                    <Text style={styles.detailText}>참여: {showDetail.member}</Text>
                  </View>
                )}
                {/* AI 보조 */}
                <View style={styles.aiHint}>
                  <FontAwesome name="magic" size={12} color="#C05A4E" />
                  <Text style={styles.aiHintText}>
                    {showDetail.location
                      ? `"${showDetail.location}" 근처 맛집을 추천해드릴까요?`
                      : '이 일정에 대해 가족에게 알림을 보낼까요?'}
                  </Text>
                </View>
                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.detailBtn} activeOpacity={0.7}>
                    <FontAwesome name="pencil" size={14} color="#C05A4E" />
                    <Text style={styles.detailBtnText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.detailBtn, styles.detailBtnDanger]} activeOpacity={0.7}>
                    <FontAwesome name="trash-o" size={14} color="#E53935" />
                    <Text style={[styles.detailBtnText, { color: '#E53935' }]}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Event Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.addModal}>
            <View style={styles.addHeader}>
              <Text style={styles.addTitle}>새 일정 추가</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)} activeOpacity={0.7}>
                <FontAwesome name="times" size={20} color="#5C4A32" />
              </TouchableOpacity>
            </View>
            <Text style={styles.addDate}>{currentYear}년 {currentMonth + 1}월 {selectedDay}일</Text>
            <Text style={styles.addLabel}>일정 제목</Text>
            <TextInput style={styles.addInput} placeholder="예: 가족 저녁 식사" placeholderTextColor="#BFAE99"
              value={newTitle} onChangeText={setNewTitle} />
            <Text style={styles.addLabel}>시간</Text>
            <TextInput style={styles.addInput} placeholder="예: 18:00" placeholderTextColor="#BFAE99"
              value={newTime} onChangeText={setNewTime} />
            <Text style={styles.addLabel}>장소 (선택)</Text>
            <TextInput style={styles.addInput} placeholder="예: 정자동 한강갈비" placeholderTextColor="#BFAE99"
              value={newLocation} onChangeText={setNewLocation} />
            <TouchableOpacity style={styles.addSubmit} activeOpacity={0.8}
              onPress={() => { setShowAdd(false); setNewTitle(''); setNewTime(''); setNewLocation(''); }}>
              <Text style={styles.addSubmitText}>일정 등록</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton} activeOpacity={0.7}>
            <FontAwesome name="chevron-left" size={16} color="#5C4A32" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} activeOpacity={0.7}>
            <Text style={styles.monthTitle}>{currentYear}년 {currentMonth + 1}월</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton} activeOpacity={0.7}>
            <FontAwesome name="chevron-right" size={16} color="#5C4A32" />
          </TouchableOpacity>
        </View>

        {!isCurrentMonth && (
          <TouchableOpacity style={styles.todayChip} onPress={goToToday} activeOpacity={0.7}>
            <FontAwesome name="calendar-check-o" size={12} color="#C05A4E" />
            <Text style={styles.todayChipText}>오늘로 이동</Text>
          </TouchableOpacity>
        )}

        <View style={styles.weekHeader}>
          {['일','월','화','수','목','금','토'].map((d,i) => (
            <Text key={d} style={[styles.weekDay, i===0&&styles.sundayColor, i===6&&styles.saturdayColor]}>{d}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {blanks.map((_,i) => <View key={`b-${i}`} style={styles.dayCell}/>)}
          {days.map(day => {
            const dow = (firstDay+day-1)%7;
            return (
              <TouchableOpacity key={day}
                style={[styles.dayCell, isToday(day)&&styles.todayCell, selectedDay===day&&!isToday(day)&&styles.selectedCell]}
                onPress={() => setSelectedDay(day)} activeOpacity={0.6}>
                <Text style={[styles.dayText, isToday(day)&&styles.todayText, selectedDay===day&&!isToday(day)&&styles.selectedText,
                  dow===0&&styles.sundayColor, dow===6&&styles.saturdayColor]}>{day}</Text>
                {hasEvents(day) && <View style={[styles.eventIndicator, isToday(day)&&styles.eventIndicatorToday]}/>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* AI 보조 힌트 */}
        <View style={styles.aiCalHint}>
          <FontAwesome name="magic" size={12} color="#C05A4E" />
          <Text style={styles.aiCalHintText}>
            {selectedEvents.length > 0
              ? `오늘 ${selectedEvents.length}개 일정이 있어요. 이동 시간을 고려하면 여유롭게 준비하세요.`
              : '이 날은 비어있어요. 가족 활동을 계획해보는 건 어때요?'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {currentMonth+1}월 {selectedDay}일 {isToday(selectedDay)?'(오늘)':''} 일정
          </Text>
          {selectedEvents.length === 0 ? (
            <TouchableOpacity style={styles.emptyState} activeOpacity={0.7} onPress={() => setShowAdd(true)}>
              <FontAwesome name="calendar-plus-o" size={32} color="#D4C8B0" />
              <Text style={styles.emptyText}>등록된 일정이 없어요</Text>
              <Text style={styles.emptySubtext}>탭하여 일정을 추가해보세요</Text>
            </TouchableOpacity>
          ) : (
            selectedEvents.map((ev,i) => (
              <TouchableOpacity key={i} style={styles.eventCard} activeOpacity={0.7} onPress={() => setShowDetail(ev)}>
                <View style={[styles.eventColorBar, { backgroundColor: ev.color }]} />
                <View style={styles.eventContent}>
                  <Text style={styles.eventTime}>{ev.time}</Text>
                  <Text style={styles.eventName}>{ev.title}</Text>
                  {ev.location && (
                    <View style={styles.eventLocRow}>
                      <FontAwesome name="map-marker" size={11} color="#9C8B75" />
                      <Text style={styles.eventLoc}>{ev.location}</Text>
                    </View>
                  )}
                </View>
                <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={{height:80}}/>
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => setShowAdd(true)}>
        <FontAwesome name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  monthNav: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:12, paddingBottom:8 },
  navButton: { width:40, height:40, borderRadius:20, backgroundColor:'#FFFFFF', justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:'#EAEAEA' },
  monthTitle: { fontSize:20, fontWeight:'700', color:'#1F1F1F', fontFamily:'PretendardBold', letterSpacing:-0.3 },
  todayChip: { flexDirection:'row', alignItems:'center', alignSelf:'center', gap:6, backgroundColor:'#FFF0ED', paddingHorizontal:14, paddingVertical:6, borderRadius:16, marginBottom:8 },
  todayChipText: { fontSize:12, fontWeight:'600', color:'#C05A4E', fontFamily:'Pretendard' },
  weekHeader: { flexDirection:'row', paddingHorizontal:20, marginBottom:4 },
  weekDay: { flex:1, textAlign:'center', fontSize:13, fontWeight:'600', color:'#9C8B75', fontFamily:'Pretendard' },
  sundayColor: { color:'#C05A4E' },
  saturdayColor: { color:'#4A90C8' },
  calendarGrid: { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:12, marginBottom:16 },
  dayCell: { width:`${100/7}%`, aspectRatio:1, justifyContent:'center', alignItems:'center' },
  todayCell: { backgroundColor:'#C05A4E', borderRadius:20 },
  selectedCell: { backgroundColor:'#FFF0ED', borderRadius:20 },
  dayText: { fontSize:15, color:'#1F1F1F' },
  todayText: { color:'#FFFFFF', fontWeight:'700' },
  selectedText: { color:'#C05A4E', fontWeight:'700' },
  eventIndicator: { width:6, height:6, borderRadius:3, backgroundColor:'#C05A4E', marginTop:3 },
  eventIndicatorToday: { backgroundColor:'#FFFFFF' },

  aiCalHint: { flexDirection:'row', alignItems:'flex-start', gap:8, marginHorizontal:20, marginBottom:16, backgroundColor:'#FFF8F0', borderRadius:12, padding:12, borderWidth:1, borderColor:'#F5E8D8' },
  aiCalHintText: { flex:1, fontSize:12, color:'#7A6B55', lineHeight:18 },

  section: { paddingHorizontal:20, marginBottom:24 },
  sectionTitle: { fontSize:18, fontWeight:'700', color:'#1F1F1F', marginBottom:12, fontFamily:'PretendardBold', letterSpacing:-0.3 },
  emptyState: { alignItems:'center', paddingVertical:32, backgroundColor:'#FFFFFF', borderRadius:14, borderWidth:1, borderColor:'#EAEAEA' },
  emptyText: { fontSize:15, fontWeight:'600', color:'#9C8B75', marginTop:12, fontFamily:'Pretendard' },
  emptySubtext: { fontSize:13, color:'#B0A590', marginTop:4, fontFamily:'Pretendard' },
  eventCard: { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'#FFFFFF', borderRadius:14, padding:14, marginBottom:8, borderWidth:1, borderColor:'#EAEAEA', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.04, shadowRadius:8, elevation:2 },
  eventColorBar: { width:4, height:44, borderRadius:2 },
  eventContent: { flex:1 },
  eventTime: { fontSize:12, color:'#888', fontWeight:'600', marginBottom:2, fontFamily:'Pretendard' },
  eventName: { fontSize:15, fontWeight:'600', color:'#1F1F1F', fontFamily:'Pretendard' },
  eventLocRow: { flexDirection:'row', alignItems:'center', gap:4, marginTop:4 },
  eventLoc: { fontSize:12, color:'#9C8B75' },
  fab: { position:'absolute', bottom:24, right:24, width:56, height:56, borderRadius:28, backgroundColor:'#C05A4E', justifyContent:'center', alignItems:'center', shadowColor:'#C05A4E', shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:8, elevation:8 },

  // Modals
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  detailModal: { backgroundColor:'#F9F8F5', borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40 },
  detailHeader: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:20 },
  detailColorDot: { width:12, height:12, borderRadius:6 },
  detailTitle: { flex:1, fontSize:20, fontWeight:'700', color:'#1F1F1F', fontFamily:'PretendardBold', letterSpacing:-0.3 },
  detailRow: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 },
  detailText: { fontSize:15, color:'#5C4A32', fontFamily:'Pretendard' },
  aiHint: { flexDirection:'row', alignItems:'flex-start', gap:8, backgroundColor:'#FFF0ED', borderRadius:12, padding:14, marginVertical:16 },
  aiHintText: { flex:1, fontSize:13, color:'#C05A4E', lineHeight:20 },
  detailActions: { flexDirection:'row', gap:12, marginTop:8 },
  detailBtn: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:14, borderRadius:12, backgroundColor:'#FFF0ED' },
  detailBtnText: { fontSize:14, fontWeight:'600', color:'#C05A4E', fontFamily:'Pretendard' },
  detailBtnDanger: { backgroundColor:'#FFF0F0' },

  addModal: { backgroundColor:'#F9F8F5', borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:40 },
  addHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  addTitle: { fontSize:20, fontWeight:'700', color:'#1F1F1F', fontFamily:'PretendardBold', letterSpacing:-0.3 },
  addDate: { fontSize:14, color:'#9C8B75', marginBottom:20 },
  addLabel: { fontSize:13, fontWeight:'600', color:'#5C4A32', marginBottom:6, fontFamily:'Pretendard' },
  addInput: { backgroundColor:'#FFFFFF', borderWidth:1, borderColor:'#EAEAEA', borderRadius:12, paddingHorizontal:14, paddingVertical:12, fontSize:15, color:'#1F1F1F', marginBottom:16, fontFamily:'Pretendard' },
  addSubmit: { backgroundColor:'#C05A4E', borderRadius:12, paddingVertical:16, alignItems:'center', marginTop:8 },
  addSubmitText: { color:'#FFFFFF', fontSize:16, fontWeight:'700', fontFamily:'PretendardBold' },
});
