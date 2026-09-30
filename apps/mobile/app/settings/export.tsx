import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Animated, Pressable, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useEffect, useMemo } from 'react';
import { showAlert } from '../../components/AppAlert';
import { useRecordsStore } from '../../store/records';
import { useEventsStore } from '../../store/events';
import {
  buildBackup, backupToText, backupFileName, parseBackup, restoreBackup,
  categoryLabel, type BackupFile, type BackupSummary, type RestoreMode,
} from '../../store/backup';
import { saveTextFile, pickTextFile } from '../../lib/saveFile';
import { useSession } from '../../store/session';
import { BookSheet } from '../../components/BookSheet';
import { saveBinaryFile } from '../../lib/saveFile';
import { buildPhotoArchive, planArchive } from '../../lib/photoArchive';
import { todayISO } from '../../store/finance';

/** '2026-09-28T07:12:00.000Z' → '2026년 9월 28일 오후 4:12' */
function formatMoment(iso: string): string {
  if (!iso) return '언제 내보냈는지 적혀 있지 않아요';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const h = d.getHours();
  const half = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${half} ${h12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ExportScreen() {
  const records = useRecordsStore((s) => s.records);
  const events = useEventsStore((s) => s.events);
  /** '파일 그대로 되돌리기'는 남의 기록까지 지우므로 관리자만 (2026-09-29 점검 A7) */
  const isAdmin = useSession((s) => s.me?.role === 'admin');

  /** 지금 갖고 있는 것 — 내보내기 전에 몇 개가 담기는지 보여준다 */
  const mine = useMemo(() => {
    const byCategory: Record<string, number> = {};
    for (const r of records) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    return { byCategory, total: records.length, events: events.length };
  }, [records, events]);

  // 되살리기 — 파일을 읽어 확인받기까지
  const [pending, setPending] = useState<{ fileName: string; data: BackupFile; summary: BackupSummary } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** 기록책(PDF) 만들기 창 */
  const [showBook, setShowBook] = useState(false);

  // ── 사진 모아 담기 (ZIP) ─────────────────────────────────
  const members = useSession((s) => s.members);
  const photoPlan = useMemo(
    () => planArchive({ records, members, today: todayISO() }),
    [records, members]
  );
  const [zipping, setZipping] = useState<{ done: number; total: number } | null>(null);
  const handlePhotos = async () => {
    if (!photoPlan.length) {
      showAlert('아직 모아둘 사진이 없어요', '기록에 사진을 붙이면 여기서 한꺼번에 내려받을 수 있어요.');
      return;
    }
    setZipping({ done: 0, total: photoPlan.length });
    try {
      const { zip, count, failed } = await buildPhotoArchive(
        { records, members, today: todayISO() },
        (done, total) => setZipping({ done, total })
      );
      const name = `familog-사진-${todayISO()}.zip`;
      const result = await saveBinaryFile(name, zip);
      if (!result.ok) { showAlert('사진을 담지 못했어요', result.reason); return; }
      showAlert(
        `사진 ${count}장을 담았어요`,
        `${name}

폴더는 기록 종류, 파일 이름은 날짜와 제목이에요.` +
          (failed ? `

${failed}장은 받지 못해 빠졌어요. 인터넷을 확인하고 다시 해보세요.` : '')
      );
    } catch (e: any) {
      showAlert('사진을 담지 못했어요', String(e?.message ?? e));
    } finally {
      setZipping(null);
    }
  };
  const dropRef = useRef<any>(null);

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;

  const openPreview = () => {
    Animated.parallel([
      Animated.timing(modalBg, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(modalSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };
  const closePreview = () => {
    Animated.parallel([
      Animated.timing(modalBg, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(modalSlide, { toValue: 500, duration: 250, useNativeDriver: true }),
    ]).start(() => setPending(null));
  };

  // ── 내보내기 ────────────────────────────────────────────
  const handleExport = async () => {
    if (!records.length && !events.length) {
      showAlert('아직 내보낼 기록이 없어요', '기록을 하나 남기고 다시 와주세요.');
      return;
    }
    const backup = buildBackup();
    const name = backupFileName();
    const result = await saveTextFile(name, backupToText(backup));
    if (result.ok) {
      showAlert(
        '기록을 파일로 담았어요',
        `${name}\n\n기록 ${backup.records.length}개 · 일정 ${backup.events.length}개가 들어 있어요.\n` +
          (result.how === 'share'
            ? '파일 앱이나 메일에 두면 휴대폰을 바꿔도 되살릴 수 있어요.'
            : '이 파일만 있으면 언제든 되살릴 수 있으니, 다른 곳에도 한 부 두세요.')
      );
    } else {
      showAlert('파일로 담지 못했어요', result.reason);
    }
  };

  // ── 백업 파일 읽기 ──────────────────────────────────────
  /** 글자를 받아 검사하고, 괜찮으면 미리보기를 띄운다 */
  const loadText = (fileName: string, text: string) => {
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      showAlert('이 파일은 읽을 수 없어요', parsed.error);
      return;
    }
    setPending({ fileName, data: parsed.data, summary: parsed.summary });
    openPreview();
  };

  const handlePick = async () => {
    try {
      const picked = await pickTextFile();
      if (!picked) return;
      loadText(picked.name, picked.text);
    } catch (e: any) {
      showAlert('파일을 읽지 못했어요', String(e?.message ?? e));
    }
  };

  /** 웹에서는 내려받은 백업을 화면에 끌어다 놓기만 해도 된다. */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = dropRef.current as HTMLElement | null;
    if (!el) return;
    const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = async (e: any) => {
      stop(e); setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) loadText(f.name, await f.text());
    };
    const onOver = (e: any) => { stop(e); setDragging(true); };
    const onLeave = (e: any) => { stop(e); setDragging(false); };
    el.addEventListener('dragover', onOver);
    el.addEventListener('dragleave', onLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', onOver);
      el.removeEventListener('dragleave', onLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, []);

  // ── 되살리기 ────────────────────────────────────────────
  const runRestore = (mode: RestoreMode) => {
    if (!pending) return;
    const { data } = pending;
    const done = () => {
      const r = restoreBackup(data, mode);
      closePreview();
      const lines = [
        `기록 ${r.addedRecords}개를 되살렸어요.`,
        r.skippedRecords > 0 ? `이미 있던 ${r.skippedRecords}개는 그대로 뒀어요.` : '',
        `일정은 ${r.addedEvents}개${r.skippedEvents > 0 ? ` (이미 있던 ${r.skippedEvents}개는 그대로)` : ''}.`,
        r.financeSettingsRestored ? '가계부 설정(예산·반복 거래)도 파일 것으로 바꿨어요.' : '',
      ].filter(Boolean);
      showAlert('다 됐어요', lines.join('\n'));
    };

    if (mode === 'replace') {
      showAlert(
        '지금 기록을 모두 지우고 바꿀까요?',
        `지금 앱에 있는 기록 ${mine.total}개와 일정 ${mine.events}개가 사라지고, ` +
          `파일에 있는 기록 ${pending.summary.totalRecords}개와 일정 ${pending.summary.totalEvents}개로 바뀝니다.\n\n` +
          '이건 되돌릴 수 없어요. 지금 것을 먼저 파일로 담아두는 게 안전해요.',
        [
          { text: '그만둘게요', style: 'cancel' },
          { text: '바꿀게요', style: 'destructive', onPress: done },
        ]
      );
      return;
    }
    done();
  };

  const categoryRows = Object.entries(mine.byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <Stack.Screen options={{ title: '기록 내보내기' }} />

      {/* 백업 파일 미리보기 — 되살리기 전에 무엇이 들었는지 보여준다 */}
      <Modal visible={!!pending} transparent statusBarTranslucent animationType="none">
        <View style={s.modalWrap}>
          <Animated.View style={[s.modalBgLayer, { opacity: modalBg }]}>
            <Pressable style={{ flex: 1 }} onPress={closePreview} />
          </Animated.View>
          <Animated.View style={[s.sheet, { transform: [{ translateY: modalSlide }] }]}>
            <View style={s.handle} />
            {pending && (
              <>
                <View style={s.sheetHeader}>
                  <Text style={s.sheetTitle}>이 백업을 되살릴까요?</Text>
                  <TouchableOpacity onPress={closePreview} activeOpacity={0.7}>
                    <FontAwesome name="times" size={20} color="#4A4A4A" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                  <View style={s.fileBox}>
                    <FontAwesome name="file-text-o" size={14} color="#2D5A3F" />
                    <Text style={s.fileName} numberOfLines={1}>{pending.fileName}</Text>
                  </View>
                  <Text style={s.fileMeta}>
                    {formatMoment(pending.summary.exportedAt)}
                    {pending.summary.exportedBy ? ` · ${pending.summary.exportedBy}님이 내보냄` : ''}
                  </Text>

                  <View style={s.tallyRow}>
                    <View style={s.tally}>
                      <Text style={s.tallyNum}>{pending.summary.totalRecords}</Text>
                      <Text style={s.tallyLabel}>기록</Text>
                    </View>
                    <View style={s.tally}>
                      <Text style={s.tallyNum}>{pending.summary.totalEvents}</Text>
                      <Text style={s.tallyLabel}>일정</Text>
                    </View>
                  </View>

                  {Object.entries(pending.summary.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([c, n]) => (
                      <View key={c} style={s.listRow}>
                        <Text style={s.listLabel}>{categoryLabel(c)}</Text>
                        <Text style={s.listValue}>{n}개</Text>
                      </View>
                    ))}

                  <Text style={s.choiceTitle}>어떻게 되살릴까요?</Text>

                  <TouchableOpacity style={s.choice} activeOpacity={0.7} onPress={() => runRestore('merge')}>
                    <View style={[s.choiceIcon, { backgroundColor: '#EFF6F1' }]}>
                      <FontAwesome name="plus" size={15} color="#2D5A3F" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.choiceLabel}>없는 것만 더하기</Text>
                      <Text style={s.choiceDesc}>
                        지금 기록은 하나도 건드리지 않아요. 파일에만 있는 것을 채워 넣어요. 안전한 쪽이에요.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {isAdmin ? (
                    <TouchableOpacity style={s.choice} activeOpacity={0.7} onPress={() => runRestore('replace')}>
                      <View style={[s.choiceIcon, { backgroundColor: '#FFF0F0' }]}>
                        <FontAwesome name="refresh" size={14} color="#D94040" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.choiceLabel}>파일 그대로 되돌리기</Text>
                        <Text style={s.choiceDesc}>
                          지금 기록을 모두 지우고 파일 내용으로 바꿔요. 가족 전체의 기록이 바뀌니 신중하게요.
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <Text style={s.adminNote}>
                      가족 전체 기록을 파일로 통째로 바꾸는 건 관리자만 할 수 있어요.
                    </Text>
                  )}
                </ScrollView>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>

      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={s.subtitle}>
          가족이 남긴 기록은 familog 안에만 있어서는 안 돼요.{'\n'}
          파일로 한 부 담아 손에 쥐고 있으면 무슨 일이 있어도 남아요.
        </Text>

        {/* 지금 갖고 있는 것 */}
        <View style={s.mineCard}>
          <Text style={s.mineTitle}>지금 담을 수 있는 것</Text>
          <View style={s.tallyRow}>
            <View style={s.tally}>
              <Text style={s.tallyNum}>{mine.total}</Text>
              <Text style={s.tallyLabel}>기록</Text>
            </View>
            <View style={s.tally}>
              <Text style={s.tallyNum}>{mine.events}</Text>
              <Text style={s.tallyLabel}>일정</Text>
            </View>
          </View>
          {categoryRows.length > 0 && (
            <View style={s.chipWrap}>
              {categoryRows.map(([c, n]) => (
                <View key={c} style={s.chip}>
                  <Text style={s.chipText}>{categoryLabel(c)} {n}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* JSON 내보내기 — 지금 진짜로 되는 것 */}
        <TouchableOpacity style={[s.card, s.cardPrimary]} activeOpacity={0.8} onPress={handleExport}>
          <View style={[s.icon, { backgroundColor: '#EFF6F1' }]}>
            <FontAwesome name="download" size={20} color="#2D5A3F" />
          </View>
          <View style={s.info}>
            <Text style={s.cardTitle}>파일로 담기 (JSON)</Text>
            <Text style={s.cardDesc}>
              기록·일정·가계부 설정을 파일 한 장에 담아 내려받아요. familog가 없어도 열어볼 수 있는 형식이에요.
              사진은 가족 창고에 그대로 두고, 파일에는 어느 사진인지만 적어요.
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color="#B0A590" />
        </TouchableOpacity>

        {/* 되살리기 */}
        <View ref={dropRef} style={[s.card, s.cardTall, dragging && s.cardDragging]}>
          <TouchableOpacity style={s.cardInner} activeOpacity={0.8} onPress={handlePick}>
            <View style={[s.icon, { backgroundColor: '#EFF6F1' }]}>
              <FontAwesome name="upload" size={20} color="#2D5A3F" />
            </View>
            <View style={s.info}>
              <Text style={s.cardTitle}>백업 파일에서 되살리기</Text>
              <Text style={s.cardDesc}>
                담아둔 파일을 골라 기록을 되살려요. 무엇이 들었는지 먼저 보여드리고, 확인을 받고 나서 넣어요.
              </Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#B0A590" />
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <Text style={[s.dropHint, dragging && s.dropHintOn]}>
              {dragging ? '여기에 놓으면 읽어볼게요' : '파일을 이 칸에 끌어다 놓아도 돼요'}
            </Text>
          )}
        </View>

        {/* 기록책 — 표지·차례가 있는 책으로 엮어 PDF로 (2026-09-30) */}
        <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={() => {
          if (!records.length) { showAlert('아직 책으로 엮을 기록이 없어요', '기록을 하나 남기고 다시 와주세요.'); return; }
          setShowBook(true);
        }}>
          <View style={[s.icon, { backgroundColor: '#EFF6F1' }]}>
            <FontAwesome name="book" size={20} color="#2D5A3F" />
          </View>
          <View style={s.info}>
            <Text style={s.cardTitle}>기록책으로 뽑기 (PDF)</Text>
            <Text style={s.cardDesc}>표지와 차례가 있는 책으로 엮어요. 사진도 함께 넣고, 인쇄해서 부모님께 드릴 수도 있어요.</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color="#B0A590" />
        </TouchableOpacity>

        {/* 사진 모아 담기 — ZIP 한 파일로 (2026-09-30) */}
        <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={handlePhotos} disabled={!!zipping}>
          <View style={[s.icon, { backgroundColor: '#EFF6F1' }]}>
            <FontAwesome name="photo" size={20} color="#2D5A3F" />
          </View>
          <View style={s.info}>
            <Text style={s.cardTitle}>사진 모아 담기 (ZIP)</Text>
            <Text style={s.cardDesc}>
              {zipping
                ? `받는 중… ${zipping.done}/${zipping.total}`
                : photoPlan.length
                  ? `기록에 붙인 사진 ${photoPlan.length}장을 한 파일로 내려받아요. 폴더는 기록 종류, 이름은 날짜와 제목이에요.`
                  : '기록에 사진을 붙이면 여기서 한꺼번에 내려받을 수 있어요.'}
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color="#B0A590" />
        </TouchableOpacity>

        <View style={s.infoBox}>
          <FontAwesome name="info-circle" size={14} color="#7A6B55" />
          <Text style={s.infoText}>
            담은 파일은 특정 기기나 프로그램에 묶이지 않는 표준 형식(JSON)이에요.
            메모장으로 열어도 읽을 수 있고, 다른 프로그램으로 옮길 수도 있어요.
          </Text>
        </View>
      </ScrollView>

      <BookSheet visible={showBook} onClose={() => setShowBook(false)} />
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5', padding: 20 },
  subtitle: { fontSize: 14, color: '#7A6B55', marginBottom: 20, lineHeight: 21, fontFamily: 'Pretendard' },

  mineCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#EAEAEA' },
  mineTitle: { fontSize: 14, fontWeight: '600', color: '#1F1F1F', fontFamily: 'Pretendard', marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  chip: { backgroundColor: '#F4F2EE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  chipText: { fontSize: 11, color: '#7A6B55', fontFamily: 'Pretendard' },

  tallyRow: { flexDirection: 'row', gap: 12 },
  tally: { flex: 1, backgroundColor: '#EFF6F1', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  tallyNum: { fontSize: 24, fontWeight: '700', color: '#2D5A3F', fontFamily: 'PretendardBold' },
  tallyLabel: { fontSize: 12, color: '#4A8C6F', fontFamily: 'Pretendard', marginTop: 2 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  cardPrimary: { borderColor: '#4A8C6F', borderWidth: 1.5 },
  cardTall: { flexDirection: 'column', alignItems: 'stretch', gap: 0 },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardDragging: { borderColor: '#4A8C6F', borderWidth: 1.5, backgroundColor: '#EFF6F1' },
  icon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1F1F1F', fontFamily: 'Pretendard' },
  cardDesc: { fontSize: 12, color: '#7A6B55', marginTop: 3, lineHeight: 18, fontFamily: 'Pretendard' },
  dropHint: { fontSize: 12, color: '#9C8B75', fontFamily: 'Pretendard', marginTop: 12, textAlign: 'center' },
  dropHintOn: { color: '#2D5A3F', fontWeight: '700' },

  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#9C8B75', fontFamily: 'Pretendard', marginTop: 18, marginBottom: 8 },

  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F4F2EE', borderRadius: 12, padding: 14, marginTop: 16 },
  infoText: { flex: 1, fontSize: 12, color: '#7A6B55', lineHeight: 18, fontFamily: 'Pretendard' },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBgLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 36, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: -10, marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },

  fileBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6F1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  fileName: { flex: 1, fontSize: 13, color: '#2D5A3F', fontFamily: 'Pretendard' },
  fileMeta: { fontSize: 12, color: '#9C8B75', fontFamily: 'Pretendard', marginTop: 8, marginBottom: 14 },

  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F4F2EE' },
  listLabel: { fontSize: 13, color: '#4A4A4A', fontFamily: 'Pretendard' },
  listValue: { fontSize: 13, color: '#1F1F1F', fontWeight: '600', fontFamily: 'Pretendard' },

  choiceTitle: { fontSize: 14, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', marginTop: 20, marginBottom: 10 },
  choice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, padding: 14, marginBottom: 10 },
  choiceIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  choiceLabel: { fontSize: 14, fontWeight: '600', color: '#1F1F1F', fontFamily: 'Pretendard' },
  choiceDesc: { fontSize: 12, color: '#7A6B55', marginTop: 3, lineHeight: 18, fontFamily: 'Pretendard' },
  adminNote: { fontSize: 12, color: '#9C8B75', fontFamily: 'Pretendard', lineHeight: 18, paddingVertical: 6 },
});
