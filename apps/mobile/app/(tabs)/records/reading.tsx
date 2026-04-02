import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';

const STATUS_OPTIONS = ['전체', '읽는 중', '완독', '읽고 싶은'];

const BOOKS = [
  { title: '어린 왕자', author: '생텍쥐페리', reader: '서준', status: '완독', rating: 5, color: '#B8E6C8', notes: '혼자서 처음 완독! "어른들은 참 이상해" 가 인상적이었대요' },
  { title: '아몬드', author: '손원평', reader: '지수', status: '읽는 중', progress: 65, color: '#FFB6C1', notes: '감정을 느끼지 못하는 소년의 이야기. 챕터 12까지 읽음' },
  { title: '나미야 잡화점의 기적', author: '히가시노 게이고', reader: '민준', status: '완독', rating: 4, color: '#B8D4E6', notes: '시간여행과 편지의 조합이 따뜻했음' },
  { title: '코스모스', author: '칼 세이건', reader: '민준', status: '읽는 중', progress: 30, color: '#B8D4E6', notes: '우주의 광대함을 느끼는 중' },
  { title: '모모', author: '미하엘 엔데', reader: '서준', status: '읽고 싶은', color: '#E6D4B8', notes: '' },
  { title: '해리포터 시리즈', author: 'J.K. 롤링', reader: '지우', status: '읽고 싶은', color: '#FFB6C1', notes: '' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <FontAwesome key={i} name={i <= rating ? 'star' : 'star-o'} size={12} color="#E6A817" />
      ))}
    </View>
  );
}

export default function ReadingScreen() {
  const [activeStatus, setActiveStatus] = useState('전체');

  const filteredBooks = activeStatus === '전체'
    ? BOOKS
    : BOOKS.filter(b => b.status === activeStatus);

  return (
    <>
      <Stack.Screen options={{ title: '독서 목록' }} />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} onPress={() => setActiveStatus('전체')} activeOpacity={0.7}>
              <FontAwesome name="book" size={18} color="#C85A4A" />
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>총 도서</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => setActiveStatus('완독')} activeOpacity={0.7}>
              <FontAwesome name="check-circle" size={18} color="#4AA86B" />
              <Text style={styles.statNumber}>7</Text>
              <Text style={styles.statLabel}>완독</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => setActiveStatus('읽는 중')} activeOpacity={0.7}>
              <FontAwesome name="bookmark" size={18} color="#E6A817" />
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>읽는 중</Text>
            </TouchableOpacity>
          </View>

          {/* Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {STATUS_OPTIONS.map((label, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.filterChip, activeStatus === label && styles.filterChipActive]}
                onPress={() => setActiveStatus(label)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, activeStatus === label && styles.filterTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Book List */}
          <View style={styles.bookList}>
            {filteredBooks.map((book, i) => (
              <TouchableOpacity key={i} style={styles.bookCard} activeOpacity={0.7}>
                <View style={[styles.bookCover, { backgroundColor: book.color }]}>
                  <FontAwesome name="book" size={24} color="#5C4A32" />
                </View>
                <View style={styles.bookInfo}>
                  <View style={styles.bookTopRow}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <View style={[styles.statusBadge, {
                      backgroundColor: book.status === '완독' ? '#E8F5E9' : book.status === '읽는 중' ? '#FFF3E0' : '#F3E5F5'
                    }]}>
                      <Text style={[styles.statusText, {
                        color: book.status === '완독' ? '#4AA86B' : book.status === '읽는 중' ? '#E6A817' : '#9C27B0'
                      }]}>{book.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.bookAuthor}>{book.author}</Text>
                  <View style={styles.bookMeta}>
                    <View style={[styles.readerDot, { backgroundColor: book.color }]} />
                    <Text style={styles.readerName}>{book.reader}</Text>
                    {book.rating && <StarRating rating={book.rating} />}
                    {book.progress && (
                      <View style={styles.progressRow}>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBar, { width: `${book.progress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{book.progress}%</Text>
                      </View>
                    )}
                  </View>
                  {book.notes ? <Text style={styles.bookNotes} numberOfLines={1}>{book.notes}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => Alert.alert('도서 추가', '새 도서 등록 기능이 곧 추가됩니다.')}
        >
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#F0E8D8',
  },
  statIcon: { marginBottom: 2 },
  statNumber: { fontSize: 22, fontWeight: '700', color: '#2D2D2D', marginTop: 4 },
  statLabel: { fontSize: 11, color: '#BFAE99', marginTop: 2 },
  filterContainer: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E8D8',
  },
  filterChipActive: { backgroundColor: '#C85A4A', borderColor: '#C85A4A' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#8B7355' },
  filterTextActive: { color: '#FFFFFF' },
  bookList: { paddingHorizontal: 20 },
  bookCard: {
    flexDirection: 'row', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  bookCover: {
    width: 56, height: 72, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  bookInfo: { flex: 1 },
  bookTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  bookTitle: { fontSize: 15, fontWeight: '700', color: '#2D2D2D', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  bookAuthor: { fontSize: 12, color: '#8B7355', marginBottom: 6 },
  bookMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  readerDot: { width: 8, height: 8, borderRadius: 4 },
  readerName: { fontSize: 11, color: '#5C4A32', fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  progressBarBg: { flex: 1, height: 4, backgroundColor: '#F0E8D8', borderRadius: 2 },
  progressBar: { height: 4, backgroundColor: '#C85A4A', borderRadius: 2 },
  progressText: { fontSize: 10, color: '#BFAE99' },
  bookNotes: { fontSize: 12, color: '#8B7355', fontStyle: 'italic' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#C85A4A', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#C85A4A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
});
