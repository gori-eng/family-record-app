/**
 * 기록 사진 부품 — 기록 화면 여러 곳이 같이 쓴다.
 *
 * - `usePhotoDraft`   작성 폼의 사진 목록 + 뒷정리(올렸다가 취소한 사진, 빼낸 사진 지우기)
 * - `PhotoPickerRow`  작성 폼 안의 "사진 고르기" 줄
 * - `PhotoGallery`    상세 화면의 사진 모음. 누르면 크게 본다
 * - `PhotoThumb`      목록 카드 옆 작은 사진
 *
 * 🔒 가계부·건강 기록에는 사진을 붙이지 않는다. 창고 정책은 "우리 가족 폴더"까지만 가르고
 *    카테고리를 모른다 — 아이 계정이 창고를 직접 뒤지면 보일 수 있어서, 돈·몸 사진은 애초에 올리지 않는다.
 */
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Modal, ActivityIndicator, Platform, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { showAlert } from './AppAlert';
import { usePhotoUrl, pickAndUpload, removePhotoFiles, removePhotoFilesWhenUnused, photosOf, MAX_PHOTOS } from '../lib/photos';
import { useRecordsStore } from '../store/records';
import { useSession } from '../store/session';
import { dbErrorText } from '../lib/dbErrors';

// ── 폼의 사진 목록 + 뒷정리 ───────────────────────────────
/**
 * 사진은 **고르는 순간 올라간다**(저장 버튼을 누를 때 한꺼번에 올리면 오래 멈춘다).
 * 그래서 폼을 그냥 닫으면 올라간 사진이 창고에 남는다 → `discard()`가 치운다.
 * 고치기에서 원래 있던 사진을 빼고 저장하면 → `commit()`이 그 파일을 지운다.
 */
export function usePhotoDraft() {
  const [photos, setPhotosState] = useState<string[]>([]);
  const current = useRef<string[]>([]);
  const original = useRef<string[]>([]);
  const uploaded = useRef<string[]>([]);
  /** 폼을 새로 열거나 닫을 때마다 바뀐다 — 올리는 도중에 닫은 폼의 사진이 다음 폼에 끼지 않게 (점검 L4) */
  const generation = useRef(0);

  const setPhotos = (next: string[]) => { current.current = next; setPhotosState(next); };

  return {
    photos,
    /** 폼을 열 때 — 새 기록이면 빈 목록, 고치기면 그 기록의 사진 */
    reset: (initial: string[] = []) => { generation.current += 1; original.current = initial; uploaded.current = []; setPhotos(initial); },
    /** 지금 폼의 번호 — 올리기를 시작할 때 받아두었다가 끝났을 때 비교한다 */
    token: () => generation.current,
    add: (paths: string[], token?: number) => {
      if (token !== undefined && token !== generation.current) {
        // 올리는 사이에 폼이 닫혔거나 다른 폼이 열렸다 — 어디에도 붙지 않을 사진이니 치운다
        removePhotoFiles(paths);
        return;
      }
      uploaded.current = [...uploaded.current, ...paths];
      setPhotos([...current.current, ...paths]);
    },
    remove: (path: string) => setPhotos(current.current.filter((p) => p !== path)),
    /** 저장했을 때 — 빼낸 원래 사진, 올렸다가 뺀 사진을 창고에서 지운다 */
    commit: () => {
      const keep = new Set(current.current);
      // 이번에 올렸다가 뺀 사진은 어떤 기록에도 적힌 적이 없어 바로 지워도 된다
      removePhotoFiles(uploaded.current.filter((p) => !keep.has(p)));
      // 원래 기록에 있던 사진은 **저장이 확실히 된 뒤에** — 저장이 실패하면 옛 기록이 되살아나며 이 사진을 다시 쓴다
      removePhotoFilesWhenUnused(original.current.filter((p) => !keep.has(p)), isPhotoInUse);
      original.current = current.current;
      uploaded.current = [];
    },
    /** 저장하지 않고 닫았을 때 — 이번에 올린 사진만 치운다 (원래 사진은 그대로) */
    discard: () => {
      generation.current += 1;
      removePhotoFiles(uploaded.current);
      uploaded.current = [];
    },
  };
}
export type PhotoDraft = ReturnType<typeof usePhotoDraft>;

/** 보관소의 어떤 기록이 이 사진을 쓰고 있나 */
export const isPhotoInUse = (path: string) =>
  useRecordsStore.getState().records.some((r) => photosOf(r.data).includes(path));

// ── 한 장 ───────────────────────────────────────────────
export function PhotoImage({ path, style, contain }: { path: string; style: any; contain?: boolean }) {
  const url = usePhotoUrl(path);
  if (url === 'failed') {
    // 창고에서 지워졌거나, 인터넷이 끊겼거나, 볼 수 없는 사진 — 끝없이 도는 표시 대신 알려준다
    return (
      <View style={[style, s.loading]}>
        <FontAwesome name="picture-o" size={18} color="#B8C4BC" />
      </View>
    );
  }
  if (!url) {
    return (
      <View style={[style, s.loading]}>
        <ActivityIndicator size="small" color="#A8C8B4" />
      </View>
    );
  }
  return <Image source={{ uri: url }} style={style} resizeMode={contain ? 'contain' : 'cover'} />;
}

// ── 폼: 사진 고르기 줄 ─────────────────────────────────────
export function PhotoPickerRow({ draft, max = MAX_PHOTOS }: { draft: PhotoDraft; max?: number }) {
  const familyId = useSession((st) => st.family?.id ?? null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const left = max - draft.photos.length;

  const run = async (from: 'library' | 'camera') => {
    if (!familyId) {
      showAlert('가족이 있어야 사진을 올릴 수 있어요', '사진은 우리 가족만 보는 곳에 모아둬요. 가족을 먼저 만들어주세요.');
      return;
    }
    setBusy({ done: 0, total: 0 });
    const token = draft.token();
    try {
      const res = await pickAndUpload(familyId, {
        from, limit: left,
        onProgress: (done, total) => setBusy({ done, total }),
      });
      if (res.paths.length) draft.add(res.paths, token);
      if (res.failed) {
        showAlert(`사진 ${res.failed}장을 올리지 못했어요`, '인터넷 연결을 확인하고 다시 골라주세요.');
      }
    } catch (e) {
      showAlert('사진을 올리지 못했어요', dbErrorText(e));
    } finally {
      setBusy(null);
    }
  };

  const add = () => {
    if (left <= 0) {
      showAlert(`사진은 ${max}장까지예요`, '빼고 싶은 사진 구석의 작은 엑스를 누르면 다른 사진을 넣을 수 있어요.');
      return;
    }
    // 웹에는 카메라 화면이 없다 — 바로 고르기
    if (Platform.OS === 'web') { run('library'); return; }
    showAlert('사진 넣기', undefined, [
      { text: '사진첩에서 고르기', onPress: () => run('library') },
      { text: '지금 찍기', onPress: () => run('camera') },
      { text: '그냥 둘게요', style: 'cancel' },
    ]);
  };

  return (
    <View style={s.pickerWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pickerRow} keyboardShouldPersistTaps="handled">
        {draft.photos.map((p) => (
          <View key={p} style={s.pickItem}>
            <PhotoImage path={p} style={s.pickImg} />
            <TouchableOpacity style={s.pickX} activeOpacity={0.7} onPress={() => draft.remove(p)} accessibilityLabel="이 사진 빼기">
              <FontAwesome name="times" size={11} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}
        {busy ? (
          <View style={[s.pickAdd, s.pickBusy]}>
            <ActivityIndicator size="small" color="#4A8C6F" />
            <Text style={s.pickAddText}>{busy.total ? `${busy.done}/${busy.total}` : '올리는 중'}</Text>
          </View>
        ) : left > 0 ? (
          <TouchableOpacity style={s.pickAdd} activeOpacity={0.7} onPress={add} accessibilityLabel="사진 넣기">
            {/* 아이콘은 칸 정중앙, 장수는 아래 구석 (운영자 지적: 아이콘이 치우쳐 보였다) */}
            <FontAwesome name="camera" size={22} color="#4A8C6F" />
            {draft.photos.length ? <Text style={s.pickAddCount}>{`${draft.photos.length}/${max}`}</Text> : null}
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ── 상세: 사진 모음 + 크게 보기 ─────────────────────────────
export function PhotoGallery({ photos }: { photos: string[] }) {
  const [viewing, setViewing] = useState<number | null>(null);
  if (!photos.length) return null;
  const one = photos.length === 1;
  return (
    <>
      {one ? (
        <TouchableOpacity activeOpacity={0.85} onPress={() => setViewing(0)} style={s.galleryOneWrap}>
          <PhotoImage path={photos[0]} style={s.galleryOne} />
        </TouchableOpacity>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.galleryRow} style={s.gallery}>
          {photos.map((p, i) => (
            <TouchableOpacity key={p} activeOpacity={0.85} onPress={() => setViewing(i)}>
              <PhotoImage path={p} style={s.galleryImg} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={viewing !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setViewing(null)}>
        <View style={s.viewer}>
          <Pressable style={s.viewerFill} onPress={() => setViewing(null)}>
            {viewing !== null && <PhotoImage path={photos[viewing]} style={s.viewerImg} contain />}
          </Pressable>
          <View style={s.viewerBar}>
            <TouchableOpacity activeOpacity={0.7} style={s.viewerBtn} disabled={!viewing}
              onPress={() => setViewing((v) => (v ? v - 1 : v))} accessibilityLabel="앞 사진">
              <FontAwesome name="chevron-left" size={18} color={viewing ? '#FFFFFF' : '#4A4A4A'} />
            </TouchableOpacity>
            <Text style={s.viewerCount}>{viewing !== null ? viewing + 1 : 0} / {photos.length}</Text>
            <TouchableOpacity activeOpacity={0.7} style={s.viewerBtn} disabled={viewing === null || viewing >= photos.length - 1}
              onPress={() => setViewing((v) => (v !== null && v < photos.length - 1 ? v + 1 : v))} accessibilityLabel="다음 사진">
              <FontAwesome name="chevron-right" size={18} color={viewing !== null && viewing < photos.length - 1 ? '#FFFFFF' : '#4A4A4A'} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.viewerClose} activeOpacity={0.7} onPress={() => setViewing(null)} accessibilityLabel="닫기">
            <FontAwesome name="times" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

// ── 목록 카드: 작은 사진 ───────────────────────────────────
/** `size`는 그 카드의 색 동그라미와 같은 크기로 — 사진이 있든 없든 줄이 가지런하게 */
export function PhotoThumb({ photos, size = 48, height }: { photos: string[]; size?: number; height?: number }) {
  if (!photos.length) return null;
  // 책·영화 표지처럼 세로가 긴 자리는 height를 따로 준다. 안 주면 정사각형
  const box = { width: size, height: height ?? size };
  return (
    <View style={box}>
      <PhotoImage path={photos[0]} style={[s.thumb, box]} />
      {photos.length > 1 && (
        <View style={s.thumbCount}><Text style={s.thumbCountText}>+{photos.length - 1}</Text></View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  loading: { backgroundColor: '#EFF6F1', alignItems: 'center', justifyContent: 'center' },

  pickerWrap: { marginBottom: 16 },
  pickerRow: { gap: 8, paddingVertical: 2 },
  pickItem: { width: 72, height: 72 },
  pickImg: { width: 72, height: 72, borderRadius: 12 },
  pickX: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  pickAdd: {
    width: 72, height: 72, borderRadius: 12, borderWidth: 1.5, borderColor: '#B8D8C0', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#F6FAF7',
  },
  pickBusy: { borderStyle: 'solid' },
  pickAddText: { fontSize: 12, color: '#4A8C6F', fontFamily: 'Pretendard' },
  pickAddCount: { position: 'absolute', right: 6, bottom: 4, fontSize: 10, color: '#4A8C6F', fontFamily: 'Pretendard' },

  gallery: { marginBottom: 14 },
  galleryRow: { gap: 8 },
  galleryImg: { width: 132, height: 132, borderRadius: 12 },
  galleryOneWrap: { marginBottom: 14 },
  galleryOne: { width: '100%', height: 220, borderRadius: 14 },

  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  viewerFill: { flex: 1, justifyContent: 'center' },
  viewerImg: { width: '100%', height: '80%' },
  viewerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingBottom: 40 },
  viewerBtn: { padding: 12 },
  viewerCount: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Pretendard', minWidth: 48, textAlign: 'center' },
  viewerClose: { position: 'absolute', top: 48, right: 20, padding: 10 },

  thumb: { borderRadius: 12 },
  thumbCount: {
    position: 'absolute', right: 2, bottom: 2, backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1,
  },
  thumbCountText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'PretendardBold' },
});
