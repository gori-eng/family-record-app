/**
 * 카드 명세서 가져오기.
 *
 * 흐름: 파일 선택 → 카드별 사용자 지정 → 미리보기 → 확인 후 저장
 * 파싱·중복판정 로직은 store/statementImport.ts에 있다 (여기는 화면만).
 */
import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { showAlert } from '../../../components/AppAlert';
import { useRecordsByCategory, useRecordsStore } from '../../../store/records';
import { MEMBERS, CURRENT_USER } from '../../../constants/family';
import { type Transaction, comma, formatDay, metaOf } from '../../../store/finance';
import {
  SHINHAN_PROFILE, parseRows, buildCandidates, summarize, toTransaction, cardsInFile,
  type ImportCandidate, type ColumnKey,
} from '../../../store/statementImport';

export default function FinanceImportScreen() {
  const router = useRouter();
  const records = useRecordsByCategory<Transaction>('finance');
  const addRecord = useRecordsStore((s) => s.addRecord);

  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<Record<ColumnKey, string | null> | null>(null);
  const [cards, setCards] = useState<{ key: string; count: number }[]>([]);
  /** 카드 뒷자리 → 가족 구성원. 한 파일에 카드가 여러 장 섞여 있을 수 있다. */
  const [cardOwners, setCardOwners] = useState<Record<string, string>>({});
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [rawParsed, setRawParsed] = useState<any[] | null>(null);
  /** 중복으로 표시된 건도 굳이 넣겠다고 사용자가 고른 것들 */
  const [forceAdd, setForceAdd] = useState<Set<number>>(new Set());

  const existing = records.map((r) => ({ id: r.id, data: r.data }));

  const dropRef = useRef<any>(null);

  /**
   * 바이트를 읽어 표로 만들고 미리보기까지 준비한다.
   * 파일 고르기와 드래그&드롭이 같은 경로를 쓴다.
   */
  const loadBuffer = async (buf: ArrayBuffer, name: string) => {
    try {
      setBusy(true);
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
      if (!rows.length) {
        showAlert('빈 파일이에요', '거래 내역이 들어 있는 파일인지 확인해주세요.');
        setBusy(false);
        return;
      }

      const headers = Object.keys(rows[0]);
      const { parsed, columns: cols } = parseRows(headers, rows, SHINHAN_PROFILE);
      if (!cols.date || !cols.amount || !cols.merchant) {
        showAlert(
          '이 파일은 아직 읽을 수 없어요',
          `날짜·금액·가맹점 열을 찾지 못했어요.\n발견한 열: ${headers.join(', ')}`
        );
        setBusy(false);
        return;
      }

      const foundCards = cardsInFile(parsed);
      // 카드가 한 장뿐이면 나로 기본 지정, 여러 장이면 사용자가 고르게 둔다
      const owners: Record<string, string> = {};
      if (foundCards.length === 1) owners[foundCards[0].key] = CURRENT_USER;

      setFileName(name);
      setColumns(cols);
      setCards(foundCards);
      setCardOwners(owners);
      setRawParsed(parsed);
      setCandidates(buildCandidates(parsed, owners, CURRENT_USER, existing));
      setForceAdd(new Set());
    } catch (e: any) {
      showAlert('파일을 읽지 못했어요', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  /** 파일 선택 대화상자 */
  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      // 웹에서는 asset.file(File 객체)이 오고, 네이티브에서는 uri가 온다
      const buf = (asset as any).file
        ? await (asset as any).file.arrayBuffer()
        : await (await fetch(asset.uri)).arrayBuffer();
      await loadBuffer(buf, asset.name ?? '명세서');
    } catch (e: any) {
      showAlert('파일을 읽지 못했어요', String(e?.message ?? e));
    }
  };

  /**
   * 웹에서는 내려받은 파일을 화면에 끌어다 놓기만 해도 된다.
   * 데스크톱에서 파일 대화상자를 여는 것보다 빠르다.
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = dropRef.current as HTMLElement | null;
    if (!el) return;
    const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = async (e: any) => {
      stop(e);
      setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      await loadBuffer(await f.arrayBuffer(), f.name);
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
  }, [existing.length]);

  /** 카드 주인을 바꾸면 소유자·지문·중복 판정이 모두 다시 계산돼야 한다. */
  const assignCard = (cardKey: string, member: string) => {
    const next = { ...cardOwners, [cardKey]: member };
    setCardOwners(next);
    if (rawParsed) setCandidates(buildCandidates(rawParsed, next, CURRENT_USER, existing));
  };

  const toggleForce = (line: number) => {
    setForceAdd((prev) => {
      const n = new Set(prev);
      n.has(line) ? n.delete(line) : n.add(line);
      return n;
    });
  };

  const unassigned = cards.filter((c) => !cardOwners[c.key]);
  const sum = candidates ? summarize(candidates) : null;
  const willAdd = candidates
    ? candidates.filter((c) => !c.skip && (!c.duplicate || forceAdd.has(c.line)))
    : [];

  const doImport = () => {
    if (!willAdd.length) return;
    for (const c of willAdd) {
      addRecord({
        category: 'finance',
        title: c.merchant,
        recordedBy: CURRENT_USER,
        createdAt: new Date(`${c.date}T12:00:00`).getTime(),
        data: toTransaction(c, fileName),
      });
    }
    showAlert(
      `${willAdd.length}건을 가져왔어요`,
      `${comma(willAdd.reduce((s, c) => s + c.amount, 0))}원이 가계부에 추가됐어요.`,
      [{ text: '가계부로 가기', onPress: () => router.replace('./finance') }]
    );
    setCandidates(null);
    setRawParsed(null);
    setFileName('');
  };

  return (
    <>
      <Stack.Screen options={{ title: '명세서 가져오기' }} />
      <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
        {/* 1단계 — 파일 선택 */}
        {!candidates && (
          <View ref={dropRef} style={[s.intro, dragging && s.introDragging]}>
            <View style={s.introIcon}>
              <FontAwesome name="file-excel-o" size={28} color="#4A8C6F" />
            </View>
            <Text style={s.introTitle}>카드 명세서를 불러오세요</Text>
            <Text style={s.introDesc}>
              카드사 홈페이지에서 내려받은 이용내역 파일(.xlsx / .csv)을 고르면{'\n'}
              거래를 하나씩 읽어 가계부에 넣어드려요.
            </Text>
            <View style={s.noteBox}>
              <Text style={s.noteTitle}>이렇게 처리해요</Text>
              <Text style={s.noteLine}>· 취소된 거래는 자동으로 빼요</Text>
              <Text style={s.noteLine}>· 이미 들어있는 거래는 건너뛰어요 (여러 번 넣어도 안전)</Text>
              <Text style={s.noteLine}>· 카드가 여러 장이면 카드별로 쓴 사람을 지정할 수 있어요</Text>
              <Text style={s.noteLine}>· 넣기 전에 미리보기로 확인할 수 있어요</Text>
            </View>
            <TouchableOpacity style={s.pickBtn} activeOpacity={0.8} onPress={pickFile} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="folder-open-o" size={15} color="#FFFFFF" />
                  <Text style={s.pickBtnText}>파일 고르기</Text>
                </>
              )}
            </TouchableOpacity>
            {Platform.OS === 'web' && (
              <Text style={s.dropHint}>
                {dragging ? '여기에 놓으세요' : '또는 파일을 이 화면에 끌어다 놓으세요'}
              </Text>
            )}
            <Text style={s.tested}>신한카드 명세서로 검증했어요. 다른 카드사도 열 이름이 비슷하면 읽힙니다.</Text>
          </View>
        )}

        {/* 2단계 — 카드별 사용자 지정 + 미리보기 */}
        {candidates && sum && (
          <>
            <View style={s.fileRow}>
              <FontAwesome name="file-excel-o" size={14} color="#4A8C6F" />
              <Text style={s.fileName} numberOfLines={1}>{fileName}</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => { setCandidates(null); setRawParsed(null); }}>
                <Text style={s.changeFile}>다른 파일</Text>
              </TouchableOpacity>
            </View>

            {/* 카드 → 쓴 사람 */}
            <View style={s.card}>
              <Text style={s.cardTitle}>카드별로 쓴 사람을 지정하세요</Text>
              <Text style={s.cardDesc}>
                파일에 카드 {cards.length}장이 들어 있어요. 지정해두면 누가 얼마 썼는지 갈려서 보여요.
              </Text>
              {cards.map((c) => (
                <View key={c.key} style={s.cardRow}>
                  <View style={s.cardTag}>
                    <FontAwesome name="credit-card" size={11} color="#4A8C6F" />
                    <Text style={s.cardTagText}>···{c.key}</Text>
                    <Text style={s.cardCount}>{c.count}건</Text>
                  </View>
                  <View style={s.ownerPicks}>
                    {MEMBERS.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[s.ownerChip, cardOwners[c.key] === m && s.ownerChipActive]}
                        activeOpacity={0.7}
                        onPress={() => assignCard(c.key, m)}>
                        <Text style={[s.ownerChipText, cardOwners[c.key] === m && s.ownerChipTextActive]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              {unassigned.length > 0 && (
                <Text style={s.warn}>
                  아직 {unassigned.length}장이 지정되지 않았어요. 지정하지 않으면 '{CURRENT_USER}'로 들어가요.
                </Text>
              )}
            </View>

            {/* 요약 */}
            <View style={s.card}>
              <Text style={s.cardTitle}>이렇게 들어갑니다</Text>
              <View style={s.sumRow}>
                <SumChip label="추가" value={willAdd.length} tone="add" />
                {sum.dup > 0 && <SumChip label="이미 있음" value={sum.dup} tone="mute" />}
                {sum.similar > 0 && <SumChip label="확인 필요" value={sum.similar} tone="warn" />}
                {sum.cancelled > 0 && <SumChip label="취소 건" value={sum.cancelled} tone="mute" />}
              </View>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>가져올 금액</Text>
                <Text style={s.totalValue}>
                  {comma(willAdd.reduce((a, c) => a + c.amount, 0))}원
                </Text>
              </View>
            </View>

            {/* 거래 미리보기 */}
            <Text style={s.sectionTitle}>미리보기</Text>
            {candidates.map((c) => {
              const forced = forceAdd.has(c.line);
              const will = !c.skip && (!c.duplicate || forced);
              const meta = metaOf(c.category);
              return (
                <View key={c.line} style={[s.row, !will && s.rowOff]}>
                  <View style={[s.rowIcon, { backgroundColor: will ? meta.color : '#EFEDE9' }]}>
                    <FontAwesome name={meta.icon as any} size={12} color={will ? '#5C4A32' : '#B8B2A8'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowDesc, !will && s.rowTextOff]} numberOfLines={1}>{c.merchant}</Text>
                    <Text style={s.rowMeta}>
                      {c.date ? formatDay(c.date) : '날짜 없음'} · {c.category} · {c.ownerMember}
                      {c.cardKey ? ` · ···${c.cardKey}` : ''}
                    </Text>
                    {c.skip && <Text style={s.reasonSkip}>{skipLabel(c.skip)}</Text>}
                    {!c.skip && c.duplicate && (
                      <TouchableOpacity activeOpacity={0.7} onPress={() => toggleForce(c.line)}>
                        <Text style={[s.reasonDup, forced && s.reasonForced]}>
                          {c.duplicate.reason === '같은거래'
                            ? '이미 가계부에 있어요'
                            : '손으로 적은 비슷한 거래가 있어요'}
                          {' · '}
                          <Text style={s.reasonAction}>{forced ? '넣지 않기' : '그래도 넣기'}</Text>
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[s.rowAmount, !will && s.rowTextOff]}>
                    {/* 합계 줄은 부호 없이, 취소 건은 환불이므로 +로 */}
                    {c.skip === '합계' ? '' : c.amount < 0 ? '+' : '-'}
                    {comma(Math.abs(c.amount))}원
                  </Text>
                </View>
              );
            })}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {candidates && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.importBtn, !willAdd.length && s.importBtnOff]}
            activeOpacity={0.8}
            disabled={!willAdd.length}
            onPress={doImport}>
            <Text style={s.importBtnText}>
              {willAdd.length ? `${willAdd.length}건 가져오기` : '가져올 거래가 없어요'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

function SumChip({ label, value, tone }: { label: string; value: number; tone: 'add' | 'mute' | 'warn' }) {
  return (
    <View style={[s.sumChip, tone === 'add' && s.sumAdd, tone === 'warn' && s.sumWarn]}>
      <Text style={[s.sumValue, tone === 'add' && s.sumValueAdd, tone === 'warn' && s.sumValueWarn]}>{value}</Text>
      <Text style={s.sumLabel}>{label}</Text>
    </View>
  );
}

const skipLabel = (skip: string) =>
  skip === '취소' ? '취소된 거래라 넣지 않아요'
    : skip === '합계' ? '합계 줄이라 넣지 않아요'
    : skip === '날짜없음' ? '날짜를 읽지 못했어요'
    : '금액이 없어요';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  intro: { padding: 24, alignItems: 'center', borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  introDragging: { borderColor: '#4A8C6F', borderStyle: 'dashed', backgroundColor: '#F2F8F4' },
  dropHint: { fontSize: 13, color: '#4A8C6F', fontFamily: 'Pretendard', marginTop: 12 },
  introIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6F1',
    justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 16,
  },
  introTitle: { fontSize: 19, color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  introDesc: { fontSize: 14, color: '#4A4A4A', fontFamily: 'Pretendard', textAlign: 'center', lineHeight: 21, marginTop: 10 },
  noteBox: {
    alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#EAEAEA', marginTop: 22, gap: 6,
  },
  noteTitle: { fontSize: 13, color: '#2D5A3F', fontFamily: 'PretendardBold', marginBottom: 2 },
  noteLine: { fontSize: 13, color: '#4A4A4A', fontFamily: 'Pretendard', lineHeight: 20 },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'stretch', backgroundColor: '#4A8C6F', borderRadius: 14, paddingVertical: 16, marginTop: 22,
  },
  pickBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: 'PretendardBold' },
  tested: { fontSize: 12, color: '#888888', fontFamily: 'Pretendard', marginTop: 14, textAlign: 'center' },

  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 16, backgroundColor: '#EFF6F1',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
  },
  fileName: { flex: 1, fontSize: 13, color: '#2D5A3F', fontFamily: 'PretendardBold' },
  changeFile: { fontSize: 12, color: '#4A8C6F', fontFamily: 'Pretendard', textDecorationLine: 'underline' },

  card: {
    marginHorizontal: 20, marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: '#EAEAEA',
  },
  cardTitle: { fontSize: 15, color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  cardDesc: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard', marginTop: 6, lineHeight: 19 },
  cardRow: { marginTop: 14, gap: 8 },
  cardTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTagText: { fontSize: 13, color: '#1F1F1F', fontFamily: 'PretendardBold' },
  cardCount: { fontSize: 12, color: '#888888', fontFamily: 'Pretendard' },
  ownerPicks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ownerChip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF',
  },
  ownerChipActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  ownerChipText: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard' },
  ownerChipTextActive: { color: '#FFFFFF', fontFamily: 'PretendardBold' },
  warn: { fontSize: 12, color: '#C2853A', fontFamily: 'Pretendard', marginTop: 12, lineHeight: 18 },

  sumRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  sumChip: { alignItems: 'center', backgroundColor: '#F4F2EE', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, minWidth: 74 },
  sumAdd: { backgroundColor: '#EFF6F1' },
  sumWarn: { backgroundColor: '#FBF3E8' },
  sumValue: { fontSize: 19, color: '#888888', fontFamily: 'PretendardBold' },
  sumValueAdd: { color: '#2D5A3F' },
  sumValueWarn: { color: '#C2853A' },
  sumLabel: { fontSize: 11, color: '#888888', fontFamily: 'Pretendard', marginTop: 2 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1EFEA',
  },
  totalLabel: { fontSize: 14, color: '#4A4A4A', fontFamily: 'Pretendard' },
  totalValue: { fontSize: 18, color: '#1F1F1F', fontFamily: 'PretendardBold' },

  sectionTitle: { fontSize: 14, color: '#4A4A4A', fontFamily: 'PretendardBold', marginHorizontal: 20, marginTop: 22, marginBottom: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginBottom: 6, backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 13, borderWidth: 1, borderColor: '#EAEAEA',
  },
  rowOff: { backgroundColor: '#F7F6F3', borderColor: '#EFEDE9' },
  rowIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  rowDesc: { fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard' },
  rowTextOff: { color: '#A8A29A', textDecorationLine: 'line-through' },
  rowMeta: { fontSize: 11, color: '#A0A0A0', fontFamily: 'Pretendard', marginTop: 3 },
  rowAmount: { fontSize: 14, color: '#4A8C6F', fontFamily: 'PretendardBold' },
  reasonSkip: { fontSize: 11, color: '#A8A29A', fontFamily: 'Pretendard', marginTop: 4 },
  reasonDup: { fontSize: 11, color: '#C2853A', fontFamily: 'Pretendard', marginTop: 4, lineHeight: 17 },
  reasonForced: { color: '#2D5A3F' },
  reasonAction: { textDecorationLine: 'underline', fontFamily: 'PretendardBold' },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: 16, paddingBottom: 24, backgroundColor: '#F9F8F5',
    borderTopWidth: 1, borderTopColor: '#EAEAEA',
  },
  importBtn: { backgroundColor: '#4A8C6F', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  importBtnOff: { backgroundColor: '#CFC7BA' },
  importBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: 'PretendardBold' },
});
