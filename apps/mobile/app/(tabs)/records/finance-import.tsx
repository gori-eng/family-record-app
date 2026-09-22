/**
 * 카드 명세서 가져오기.
 *
 * 흐름: 파일 선택 → (필요하면 열 맞추기) → 카드별 사용자 지정 → 미리보기 → 확인 후 저장
 * 파싱·중복판정은 store/statementImport.ts, 기억해둘 설정은 store/financeSettings.ts에 있다.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Modal, Pressable,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { showAlert } from '../../../components/AppAlert';
import { useRecordsByCategory, useRecordsStore } from '../../../store/records';
import { MEMBERS, CURRENT_USER } from '../../../constants/family';
import { type Transaction, comma, formatDay, metaOf, EXPENSE_CATEGORIES } from '../../../store/finance';
import {
  SHINHAN_PROFILE, parseRows, buildCandidates, summarize, toTransaction, toInstallments,
  cardsInFile, type ImportCandidate, type ColumnKey, type RawRow,
} from '../../../store/statementImport';
import { useFinanceSettings, headerSignatureOf } from '../../../store/financeSettings';

/** 열 맞추기 화면에 보여줄 항목 — 앞의 3개는 없으면 가져올 수 없다. */
const COLUMN_FIELDS: { key: ColumnKey; label: string; required: boolean }[] = [
  { key: 'date', label: '거래일', required: true },
  { key: 'merchant', label: '가맹점명', required: true },
  { key: 'amount', label: '금액', required: true },
  { key: 'card', label: '이용카드', required: false },
  { key: 'approvalNo', label: '승인번호', required: false },
  { key: 'status', label: '취소상태', required: false },
  { key: 'kind', label: '매입구분', required: false },
  { key: 'installment', label: '할부(이용구분)', required: false },
];

export default function FinanceImportScreen() {
  const router = useRouter();
  const records = useRecordsByCategory<Transaction>('finance');
  const addRecord = useRecordsStore((s) => s.addRecord);

  const settings = useFinanceSettings();

  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');

  // 원본 표 — 열 매핑을 바꾸면 이걸로 다시 파싱한다
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [columnOverride, setColumnOverride] = useState<Partial<Record<ColumnKey, string>>>({});
  const [showMapper, setShowMapper] = useState(false);
  const [mappingField, setMappingField] = useState<ColumnKey | null>(null);

  const [cards, setCards] = useState<{ key: string; count: number }[]>([]);
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null);
  const [forceAdd, setForceAdd] = useState<Set<number>>(new Set());
  /** 카테고리를 고치는 중인 줄 */
  const [editingLine, setEditingLine] = useState<number | null>(null);

  const existing = records.map((r) => ({ id: r.id, data: r.data }));
  const dropRef = useRef<any>(null);

  /** 표를 다시 파싱해서 미리보기를 갱신한다. 설정이 바뀔 때마다 부른다. */
  const reparse = (
    hs: string[],
    rows: RawRow[],
    override: Partial<Record<ColumnKey, string>>,
    owners: Record<string, string> = settings.cardOwners
  ) => {
    const { parsed, columns } = parseRows(hs, rows, SHINHAN_PROFILE, {
      columnOverride: override,
      categoryOverrides: settings.categoryOverrides,
    });
    setCards(cardsInFile(parsed));
    setCandidates(buildCandidates(parsed, owners, CURRENT_USER, existing));
    return columns;
  };

  /** 바이트를 읽어 표로 만들고 미리보기까지 준비한다. */
  const loadBuffer = async (buf: ArrayBuffer, name: string) => {
    try {
      setBusy(true);
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: RawRow[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
      if (!rows.length) {
        showAlert('빈 파일이에요', '거래 내역이 들어 있는 파일인지 확인해주세요.');
        return;
      }

      const hs = Object.keys(rows[0]);
      // 전에 이 모양의 파일을 맞춰둔 적이 있으면 그 매핑을 먼저 쓴다
      const sig = headerSignatureOf(hs);
      const saved = settings.savedProfiles.find((p) => p.headerSignature === sig);
      const override = saved?.columnMap ?? {};

      setFileName(name);
      setHeaders(hs);
      setRawRows(rows);
      setColumnOverride(override);
      setForceAdd(new Set());

      const columns = reparse(hs, rows, override);
      // 꼭 있어야 하는 열을 못 찾았으면 사용자가 직접 지정하게 한다
      if (!columns.date || !columns.amount || !columns.merchant) setShowMapper(true);
    } catch (e: any) {
      showAlert('파일을 읽지 못했어요', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel', 'text/csv', '*/*',
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const buf = (asset as any).file
        ? await (asset as any).file.arrayBuffer()
        : await (await fetch(asset.uri)).arrayBuffer();
      await loadBuffer(buf, asset.name ?? '명세서');
    } catch (e: any) {
      showAlert('파일을 읽지 못했어요', String(e?.message ?? e));
    }
  };

  /** 웹에서는 내려받은 파일을 화면에 끌어다 놓기만 해도 된다. */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = dropRef.current as HTMLElement | null;
    if (!el) return;
    const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = async (e: any) => {
      stop(e); setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) await loadBuffer(await f.arrayBuffer(), f.name);
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
  }, [existing.length, settings.cardOwners, settings.categoryOverrides, settings.savedProfiles]);

  /** 카드 주인 지정 — 기억해두면 다음 가져오기 때 자동으로 붙는다. */
  const assignCard = (cardKey: string, member: string) => {
    settings.setCardOwner(cardKey, member);
    if (rawRows.length) {
      reparse(headers, rawRows, columnOverride, { ...settings.cardOwners, [cardKey]: member });
    }
  };

  /** 열을 직접 지정 — 다음부터 같은 모양 파일은 자동으로 맞춰진다. */
  const setColumn = (key: ColumnKey, header: string | null) => {
    const next = { ...columnOverride };
    if (header) next[key] = header; else delete next[key];
    setColumnOverride(next);
    setMappingField(null);
    reparse(headers, rawRows, next);
  };

  const saveMapping = () => {
    const sig = headerSignatureOf(headers);
    settings.saveProfile({
      id: sig.slice(0, 24),
      label: fileName.replace(/\.(xlsx|xls|csv)$/i, ''),
      columnMap: columnOverride,
      headerSignature: sig,
    });
    setShowMapper(false);
    showAlert('열 맞추기를 저장했어요', '다음에 같은 모양의 파일을 넣으면 자동으로 맞춰져요.');
  };

  /** 카테고리 교정 — 고친 결과를 기억해 다음 가져오기 때 바로 적용한다. */
  const fixCategory = (line: number, category: string) => {
    const target = candidates?.find((c) => c.line === line);
    if (target) settings.setCategoryOverride(target.merchant, category);
    setEditingLine(null);
    setCandidates((prev) =>
      prev ? prev.map((c) => (c.line === line ? { ...c, category } : c)) : prev
    );
  };

  const toggleForce = (line: number) => {
    setForceAdd((prev) => {
      const n = new Set(prev);
      n.has(line) ? n.delete(line) : n.add(line);
      return n;
    });
  };

  const unassigned = cards.filter((c) => !settings.cardOwners[c.key]);
  const sum = candidates ? summarize(candidates) : null;
  const willAdd = useMemo(
    () => (candidates ?? []).filter((c) => !c.skip && (!c.duplicate || forceAdd.has(c.line))),
    [candidates, forceAdd]
  );
  const hasInstallment = willAdd.some((c) => c.months > 1);
  const editingRow = candidates?.find((c) => c.line === editingLine) ?? null;

  const doImport = () => {
    if (!willAdd.length) return;
    let count = 0;
    for (const c of willAdd) {
      // 할부를 나눠 적을지는 설정에 따른다
      const txs = settings.installmentPolicy === 'split'
        ? toInstallments(c, fileName)
        : [toTransaction(c, fileName)];
      for (const tx of txs) {
        addRecord({
          category: 'finance',
          title: tx.desc,
          recordedBy: CURRENT_USER,
          createdAt: new Date(`${tx.date}T12:00:00`).getTime(),
          data: tx,
        });
        count += 1;
      }
    }
    showAlert(
      `${count}건을 가져왔어요`,
      `${comma(willAdd.reduce((s, c) => s + c.amount, 0))}원이 가계부에 추가됐어요.`,
      [{ text: '가계부로 가기', onPress: () => router.replace('./finance') }]
    );
    setCandidates(null);
    setRawRows([]);
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

            {/* 기억해둔 설정 */}
            {(Object.keys(settings.cardOwners).length > 0
              || settings.savedProfiles.length > 0
              || Object.keys(settings.categoryOverrides).length > 0) && (
              <View style={s.memoryBox}>
                <Text style={s.memoryTitle}>기억하고 있어요</Text>
                {Object.entries(settings.cardOwners).map(([k, v]) => (
                  <Text key={k} style={s.memoryLine}>· 카드 ···{k} → {v}</Text>
                ))}
                {settings.savedProfiles.map((p) => (
                  <Text key={p.id} style={s.memoryLine}>· 열 맞추기: {p.label}</Text>
                ))}
                {Object.keys(settings.categoryOverrides).length > 0 && (
                  <Text style={s.memoryLine}>
                    · 카테고리 교정 {Object.keys(settings.categoryOverrides).length}건
                  </Text>
                )}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    showAlert('기억한 설정을 지울까요?', '카드 지정·열 맞추기·카테고리 교정이 모두 지워져요.', [
                      { text: '취소', style: 'cancel' },
                      { text: '지우기', style: 'destructive', onPress: () => settings.resetAll() },
                    ])
                  }>
                  <Text style={s.memoryReset}>모두 지우기</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={s.pickBtn} activeOpacity={0.8} onPress={pickFile} disabled={busy}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : (
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
            <Text style={s.tested}>
              신한카드 명세서로 검증했어요. 다른 카드사는 열을 한 번 맞춰주면 그 뒤로 자동이에요.
            </Text>
          </View>
        )}

        {/* 2단계 — 미리보기 */}
        {candidates && sum && (
          <>
            <View style={s.fileRow}>
              <FontAwesome name="file-excel-o" size={14} color="#4A8C6F" />
              <Text style={s.fileName} numberOfLines={1}>{fileName}</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowMapper(true)}>
                <Text style={s.changeFile}>열 맞추기</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPress={() => { setCandidates(null); setRawRows([]); }}>
                <Text style={s.changeFile}>다른 파일</Text>
              </TouchableOpacity>
            </View>

            {/* 카드 → 쓴 사람 */}
            <View style={s.card}>
              <Text style={s.cardTitle}>카드별로 쓴 사람을 지정하세요</Text>
              <Text style={s.cardDesc}>
                파일에 카드 {cards.length}장이 들어 있어요. 한 번 지정하면 다음부터 자동으로 붙어요.
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
                        style={[s.ownerChip, settings.cardOwners[c.key] === m && s.ownerChipActive]}
                        activeOpacity={0.7}
                        onPress={() => assignCard(c.key, m)}>
                        <Text style={[s.ownerChipText, settings.cardOwners[c.key] === m && s.ownerChipTextActive]}>
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

            {/* 할부 정책 — 할부 건이 있을 때만 */}
            {hasInstallment && (
              <View style={s.card}>
                <Text style={s.cardTitle}>할부는 어떻게 적을까요?</Text>
                <Text style={s.cardDesc}>
                  정답이 없어요. 명세서와 숫자를 맞추려면 '결제한 달에 전액',{'\n'}
                  통장에서 빠지는 돈에 맞추려면 '매달 나눠서'를 고르세요.
                </Text>
                <View style={s.policyRow}>
                  {([['결제한 달에 전액', 'full'], ['매달 나눠서', 'split']] as const).map(([label, val]) => (
                    <TouchableOpacity
                      key={val}
                      style={[s.policyChip, settings.installmentPolicy === val && s.policyChipActive]}
                      activeOpacity={0.7}
                      onPress={() => settings.setInstallmentPolicy(val)}>
                      <Text style={[s.policyText, settings.installmentPolicy === val && s.policyTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

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
                <Text style={s.totalValue}>{comma(willAdd.reduce((a, c) => a + c.amount, 0))}원</Text>
              </View>
            </View>

            <Text style={s.sectionTitle}>미리보기 — 카테고리를 눌러 고칠 수 있어요</Text>
            {candidates.map((c) => {
              const forced = forceAdd.has(c.line);
              const will = !c.skip && (!c.duplicate || forced);
              const meta = metaOf(c.category);
              return (
                <View key={c.line} style={[s.row, !will && s.rowOff]}>
                  <TouchableOpacity
                    style={[s.rowIcon, { backgroundColor: will ? meta.color : '#EFEDE9' }]}
                    activeOpacity={0.7}
                    disabled={!!c.skip}
                    onPress={() => setEditingLine(c.line)}>
                    <FontAwesome name={meta.icon as any} size={12} color={will ? '#5C4A32' : '#B8B2A8'} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowDesc, !will && s.rowTextOff]} numberOfLines={1}>{c.merchant}</Text>
                    <TouchableOpacity activeOpacity={0.7} disabled={!!c.skip} onPress={() => setEditingLine(c.line)}>
                      <Text style={s.rowMeta}>
                        {c.date ? formatDay(c.date) : '날짜 없음'} · <Text style={s.rowCat}>{c.category}</Text> · {c.ownerMember}
                        {c.cardKey ? ` · ···${c.cardKey}` : ''}
                        {c.months > 1 ? ` · ${c.months}개월 할부` : ''}
                      </Text>
                    </TouchableOpacity>
                    {c.skip && <Text style={s.reasonSkip}>{skipLabel(c.skip)}</Text>}
                    {!c.skip && c.duplicate && (
                      <TouchableOpacity activeOpacity={0.7} onPress={() => toggleForce(c.line)}>
                        <Text style={[s.reasonDup, forced && s.reasonForced]}>
                          {c.duplicate.reason === '같은거래' ? '이미 가계부에 있어요' : '손으로 적은 비슷한 거래가 있어요'}
                          {' · '}<Text style={s.reasonAction}>{forced ? '넣지 않기' : '그래도 넣기'}</Text>
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[s.rowAmount, !will && s.rowTextOff]}>
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

      {/* 열 맞추기 */}
      <Modal visible={showMapper} transparent statusBarTranslucent animationType="fade">
        <View style={s.modalWrap}>
          <Pressable style={s.modalBg} onPress={() => setShowMapper(false)} />
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>열 맞추기</Text>
            <Text style={s.modalDesc}>
              이 파일의 어느 열이 무엇인지 알려주세요. 한 번만 하면 다음부터 자동이에요.
            </Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {COLUMN_FIELDS.map((f) => {
                const cur = columnOverride[f.key];
                return (
                  <View key={f.key} style={s.mapRow}>
                    <Text style={s.mapLabel}>
                      {f.label}{f.required && <Text style={s.mapReq}> *</Text>}
                    </Text>
                    <TouchableOpacity
                      style={[s.mapPick, !cur && f.required && s.mapPickEmpty]}
                      activeOpacity={0.7}
                      onPress={() => setMappingField(mappingField === f.key ? null : f.key)}>
                      <Text style={[s.mapPickText, !cur && s.mapPickTextEmpty]}>
                        {cur ?? '자동 / 선택 안 함'}
                      </Text>
                      <FontAwesome name="caret-down" size={12} color="#888888" />
                    </TouchableOpacity>
                    {mappingField === f.key && (
                      <View style={s.mapOptions}>
                        <TouchableOpacity style={s.mapOption} activeOpacity={0.7} onPress={() => setColumn(f.key, null)}>
                          <Text style={s.mapOptionText}>자동 / 선택 안 함</Text>
                        </TouchableOpacity>
                        {headers.map((h) => (
                          <TouchableOpacity key={h} style={s.mapOption} activeOpacity={0.7} onPress={() => setColumn(f.key, h)}>
                            <Text style={s.mapOptionText}>{h || '(이름 없는 열)'}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.modalBtn, s.modalBtnGhost]} activeOpacity={0.7} onPress={() => setShowMapper(false)}>
                <Text style={s.modalBtnGhostText}>닫기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalBtn} activeOpacity={0.7} onPress={saveMapping}>
                <Text style={s.modalBtnText}>저장하고 기억하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 카테고리 고치기 */}
      <Modal visible={!!editingRow} transparent statusBarTranslucent animationType="fade">
        <View style={s.modalWrap}>
          <Pressable style={s.modalBg} onPress={() => setEditingLine(null)} />
          <View style={s.modalSheet}>
            <Text style={s.modalTitle} numberOfLines={1}>{editingRow?.merchant}</Text>
            <Text style={s.modalDesc}>
              카테고리를 고르면 이 가게는 다음에도 같은 카테고리로 들어가요.
            </Text>
            <View style={s.catGrid}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.name}
                  style={[s.catChip, editingRow?.category === cat.name && s.catChipActive]}
                  activeOpacity={0.7}
                  onPress={() => editingRow && fixCategory(editingRow.line, cat.name)}>
                  <View style={[s.catDot, { backgroundColor: cat.color }]}>
                    <FontAwesome name={cat.icon as any} size={11} color="#5C4A32" />
                  </View>
                  <Text style={[s.catChipText, editingRow?.category === cat.name && s.catChipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

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
  memoryBox: {
    alignSelf: 'stretch', backgroundColor: '#EFF6F1', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#D0E4D6', marginTop: 12, gap: 4,
  },
  memoryTitle: { fontSize: 13, color: '#2D5A3F', fontFamily: 'PretendardBold', marginBottom: 2 },
  memoryLine: { fontSize: 13, color: '#4A4A4A', fontFamily: 'Pretendard', lineHeight: 20 },
  memoryReset: { fontSize: 12, color: '#4A8C6F', fontFamily: 'Pretendard', textDecorationLine: 'underline', marginTop: 6 },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'stretch', backgroundColor: '#4A8C6F', borderRadius: 14, paddingVertical: 16, marginTop: 22,
  },
  pickBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: 'PretendardBold' },
  tested: { fontSize: 12, color: '#888888', fontFamily: 'Pretendard', marginTop: 14, textAlign: 'center', lineHeight: 18 },

  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
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

  policyRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  policyChip: {
    flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF',
  },
  policyChipActive: { backgroundColor: '#EFF6F1', borderColor: '#4A8C6F' },
  policyText: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard' },
  policyTextActive: { color: '#2D5A3F', fontFamily: 'PretendardBold' },

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
  rowCat: { color: '#4A8C6F', textDecorationLine: 'underline' },
  rowAmount: { fontSize: 14, color: '#4A8C6F', fontFamily: 'PretendardBold' },
  reasonSkip: { fontSize: 11, color: '#A8A29A', fontFamily: 'Pretendard', marginTop: 4 },
  reasonDup: { fontSize: 11, color: '#C2853A', fontFamily: 'Pretendard', marginTop: 4, lineHeight: 17 },
  reasonForced: { color: '#2D5A3F' },
  reasonAction: { textDecorationLine: 'underline', fontFamily: 'PretendardBold' },

  modalWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12,
  },
  modalTitle: { fontSize: 17, color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  modalDesc: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard', marginTop: 8, marginBottom: 16, lineHeight: 19 },
  mapRow: { marginBottom: 12 },
  mapLabel: { fontSize: 13, color: '#4A4A4A', fontFamily: 'Pretendard', marginBottom: 5 },
  mapReq: { color: '#D94040' },
  mapPick: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EAEAEA',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  mapPickEmpty: { borderColor: '#E8C4C4', backgroundColor: '#FCF6F6' },
  mapPickText: { fontSize: 13, color: '#1F1F1F', fontFamily: 'Pretendard' },
  mapPickTextEmpty: { color: '#B0A89C' },
  mapOptions: { marginTop: 6, borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 10, overflow: 'hidden' },
  mapOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4F2EE' },
  mapOptionText: { fontSize: 13, color: '#4A4A4A', fontFamily: 'Pretendard' },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 18 },
  modalBtn: { flex: 1, backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalBtnGhost: { backgroundColor: '#F1EFEA' },
  modalBtnText: { fontSize: 14, color: '#FFFFFF', fontFamily: 'PretendardBold' },
  modalBtnGhostText: { fontSize: 14, color: '#4A4A4A', fontFamily: 'PretendardBold' },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF',
  },
  catChipActive: { borderColor: '#4A8C6F', backgroundColor: '#EFF6F1' },
  catDot: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catChipText: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard' },
  catChipTextActive: { color: '#2D5A3F', fontFamily: 'PretendardBold' },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: 16, paddingBottom: 24, backgroundColor: '#F9F8F5',
    borderTopWidth: 1, borderTopColor: '#EAEAEA',
  },
  importBtn: { backgroundColor: '#4A8C6F', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  importBtnOff: { backgroundColor: '#CFC7BA' },
  importBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: 'PretendardBold' },
});
