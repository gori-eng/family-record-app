import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { showAlert } from './AppAlert';
import { useRecordsStore, type FamilyRecord } from '../store/records';
import { eulreul } from '../lib/korean';

/**
 * 기록 지우기 — 화면 여덟 곳이 같이 쓴다.
 *
 * ── 왜 공용으로 뺐나 ──────────────────────────────────
 * 기록이 DB에 영구 저장되면서 **잘못 쓴 기록을 지울 방법이 필요해졌다.**
 * 예전에는 새로고침하면 다 사라져서 문제가 안 됐다.
 * 화면마다 확인창·되돌리기를 따로 만들면 여덟 벌이 조금씩 달라진다.
 * 가계부·캘린더가 이미 쓰는 방식(확인창 → 10초 되돌리기)을 그대로 옮겼다.
 *
 * ── 왜 되돌리기가 필요한가 ────────────────────────────
 * 이 앱의 약속은 "기록이 사라지지 않는다"이다(§1). 지우는 버튼을 만들면서
 * 실수 한 번에 영영 사라지게 두면 그 약속과 어긋난다.
 */
export function useRecordDelete(what = '기록') {
  const removeRecord = useRecordsStore((s) => s.removeRecord);
  const addRecordsRaw = useRecordsStore((s) => s.addRecordsRaw);

  const [undoItem, setUndoItem] = useState<FamilyRecord | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /** 확인을 받고 지운다. `after`는 상세 모달을 닫는 데 쓴다 */
  const askDelete = (id: string, opts?: { after?: () => void }) => {
    const record = useRecordsStore.getState().records.find((r) => r.id === id);
    if (!record) return;
    const name = record.title || what;

    showAlert(`이 ${what} 지울까요?`, `'${name}'${eulreul(name)} 지웁니다. 바로 되돌릴 수 있어요.`, [
      { text: '그냥 둘게요', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () => {
          removeRecord(id);
          opts?.after?.();
          setUndoItem(record);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setUndoItem(null), 10000);
        },
      },
    ]);
  };

  const undo = () => {
    if (!undoItem) return;
    // 되돌리면 DB에 다시 넣는다. id는 새로 받지만 내용은 그대로다
    addRecordsRaw([undoItem]);
    setUndoItem(null);
    if (timer.current) clearTimeout(timer.current);
  };

  const undoBar = undoItem ? (
    <View style={s.undoBar}>
      <Text style={s.undoText} numberOfLines={1}>'{undoItem.title}' 지웠어요</Text>
      <TouchableOpacity style={s.undoBtn} activeOpacity={0.7} onPress={undo}>
        <FontAwesome name="undo" size={12} color="#FFFFFF" />
        <Text style={s.undoBtnText}>되돌리기</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return { askDelete, undoBar };
}

/** 상세 모달 맨 아래에 놓는 지우기 줄. 화면마다 스타일을 또 만들지 않아도 된다 */
export function DeleteRecordRow({ onPress, label = '이 기록 지우기' }: { onPress: () => void; label?: string }) {
  return (
    <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={onPress}>
      <FontAwesome name="trash-o" size={14} color="#D94040" />
      <Text style={s.rowText}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#FFF0F0', borderRadius: 12, paddingVertical: 13,
    marginTop: 18, marginBottom: 4,
  },
  rowText: { fontSize: 14, fontWeight: '600', color: '#D94040', fontFamily: 'Pretendard' },

  undoBar: {
    position: 'absolute', bottom: 20, left: 20, right: 88, zIndex: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    backgroundColor: '#2D2A26', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
  },
  undoText: { flex: 1, fontSize: 13, color: '#F4F2EE', fontFamily: 'Pretendard' },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  undoBtnText: { fontSize: 13, color: '#FFFFFF', fontFamily: 'PretendardBold' },
});
