/**
 * 기록책(PDF) 만들기 창 — 어떤 칸을 넣을지, 사진을 넣을지 고르고 뽑는다.
 *
 * 책의 내용은 lib/bookHtml.ts(순수 함수), 뽑아서 건네는 건 lib/printBook.ts가 한다.
 * 이 창은 고르기만 한다.
 *
 * - 가계부는 기본으로 빼둔다. 거래가 수백 건이면 책이 가계부로 가득 차고, 돈 이야기는
 *   책을 가족에게 돌려볼 때 빼고 싶은 경우가 많다. 넣으면 달마다 표 한 장으로 들어간다
 * - 아이 계정에는 가계부·건강 칸이 애초에 없다(기록이 안 내려온다 — DB 00010)
 */
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ActivityIndicator, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { showAlert } from './AppAlert';
import { useRecordsStore } from '../store/records';
import { useSession } from '../store/session';
import { useCanSee } from '../store/family';
import { buildBookHtml, BOOK_ORDER, BOOK_CHAPTERS } from '../lib/bookHtml';
import { printBook } from '../lib/printBook';
import { photoUrlsFor, photosOf } from '../lib/photos';
import { todayISO } from '../store/finance';

export function BookSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const records = useRecordsStore((s) => s.records);
  const familyName = useSession((s) => s.family?.name ?? '우리 가족');
  const me = useSession((s) => s.me?.display_name ?? '');
  const canSee = useCanSee();

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of records) m[r.category] = (m[r.category] ?? 0) + 1;
    return m;
  }, [records]);
  const available = BOOK_ORDER.filter((c) => canSee(c) && (counts[c] ?? 0) > 0);

  const [picked, setPicked] = useState<string[]>([]);
  const [withPhotos, setWithPhotos] = useState(true);
  const [busy, setBusy] = useState(false);

  // 열 때마다 기본값 — 가계부만 빼고 전부
  useEffect(() => {
    if (visible) setPicked(available.filter((c) => c !== 'finance'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (c: string) =>
    setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const chosen = records.filter((r) => picked.includes(r.category));
  const photoCount = chosen.reduce((n, r) => n + photosOf(r.data).length, 0);

  const make = async () => {
    if (!chosen.length) {
      showAlert('넣을 칸을 골라주세요', '적어도 한 칸은 있어야 책이 돼요.');
      return;
    }
    setBusy(true);
    try {
      const urls = withPhotos && photoCount ? await photoUrlsFor(chosen.flatMap((r) => photosOf(r.data))) : undefined;
      const today = todayISO();
      const html = buildBookHtml(chosen, {
        familyName, categories: BOOK_ORDER.filter((c) => picked.includes(c)),
        photoUrls: urls, today, madeBy: me || undefined,
      });
      const res = await printBook(html, `familog-기록책-${today}.pdf`);
      if (!res.ok) {
        showAlert('기록책을 만들지 못했어요', res.reason);
        return;
      }
      onClose();
      if (Platform.OS === 'web') {
        // 인쇄 창은 브라우저가 띄운다 — 거기서 무엇을 골라야 하는지 알려준다
        showAlert('인쇄 창이 열렸어요', "대상(프린터)에서 'PDF로 저장'을 고르면 파일로 남아요.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.wrap}>
        <Pressable style={s.bg} onPress={busy ? undefined : onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>기록책 만들기</Text>
          <Text style={s.sub}>표지와 차례가 있는 책으로 엮어 PDF로 뽑아요. 넣을 칸을 골라주세요.</Text>

          {available.length === 0 ? (
            <Text style={s.empty}>아직 책에 넣을 기록이 없어요</Text>
          ) : (
            <View style={s.chips}>
              {available.map((c) => {
                const on = picked.includes(c);
                return (
                  <TouchableOpacity key={c} style={[s.chip, on && s.chipOn]} activeOpacity={0.7} onPress={() => toggle(c)}>
                    <FontAwesome name={on ? 'check' : 'plus'} size={11} color={on ? '#FFFFFF' : '#888888'} />
                    <Text style={[s.chipText, on && s.chipTextOn]}>{BOOK_CHAPTERS[c]?.title ?? c} {counts[c]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {photoCount > 0 && (
            <TouchableOpacity style={s.toggleRow} activeOpacity={0.7} onPress={() => setWithPhotos((v) => !v)}>
              <FontAwesome name={withPhotos ? 'check-square' : 'square-o'} size={18} color={withPhotos ? '#4A8C6F' : '#BBBBBB'} />
              <Text style={s.toggleText}>사진도 넣기 ({photoCount}장)</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[s.btn, (busy || !chosen.length) && s.btnOff]} activeOpacity={0.8}
            disabled={busy || !chosen.length} onPress={make}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={s.btnText}>{chosen.length ? `기록 ${chosen.length}개로 책 만들기` : '칸을 골라주세요'}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.cancel} activeOpacity={0.7} onPress={onClose} disabled={busy}>
            <Text style={s.cancelText}>그냥 둘게요</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 6 },
  sub: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard', lineHeight: 19, marginBottom: 16 },
  empty: { fontSize: 14, color: '#888888', fontFamily: 'Pretendard', textAlign: 'center', paddingVertical: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17,
    borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF',
  },
  chipOn: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  chipText: { fontSize: 13, color: '#4A4A4A', fontFamily: 'Pretendard' },
  chipTextOn: { color: '#FFFFFF', fontFamily: 'PretendardBold' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, marginBottom: 8 },
  toggleText: { fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard' },
  btn: { backgroundColor: '#4A8C6F', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnOff: { backgroundColor: '#B8D0C2' },
  btnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'PretendardBold' },
  cancel: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { color: '#888888', fontSize: 14, fontFamily: 'Pretendard' },
});
