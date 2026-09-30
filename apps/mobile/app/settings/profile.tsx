import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, Animated, Pressable } from 'react-native';
import { showAlert } from '../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { getSession, updateMyName, renameMe } from '@core/supabase';
import { useSession } from '../../store/session';
import { ROLE_LABEL } from '../../store/family';
import { useRecordsStore } from '../../store/records';
import { useEventsStore } from '../../store/events';
import { attachFinanceSettings } from '../../store/financeSettings';
import { ro, iga } from '../../lib/korean';
import { dbErrorText } from '../../lib/dbErrors';
import { Avatar, PHOTO_PREFIX, avatarPhotoPath } from '../../components/Avatar';
import { pickAndUploadAvatar, removePhotoFiles } from '../../lib/photos';
import { Platform } from 'react-native';

/**
 * 프로필 고치기.
 *
 * ── 예전 화면은 가짜였다 (2026-09-29) ─────────────────────
 * '김지수' · 'jisoo@family.com' · 역할 '모'가 박혀 있었고, 저장하기는 **아무것도 저장하지 않으면서**
 * "프로필이 업데이트되었습니다"라고 알렸다. 거짓으로 안심시키는 화면이라 진짜로 만들었다.
 *
 * ── 고칠 수 있는 것 / 없는 것 ────────────────────────────
 * - 전체 이름(full_name) · 이모지 → 고친다. DB에 저장되고 가족 모두에게 보인다
 * - 짧은 이름(display_name) → 고친다 (2026-09-30). 기록이 이 이름 글자로 쓴 사람을 가리키므로
 *   DB 함수 `rename_me`(00011)가 옛 이름이 적힌 자리(쓴 사람·돈 쓴 사람·거래 지문·일정 참여자·
 *   카드 주인…)를 **한 번에 함께** 고친다. 바꾸기 전에 몇 건이 함께 바뀌는지 알려주고 확인을 받는다
 * - 이메일 → 로그인 계정이라 보기만
 * - 역할 → 보기만. 스스로 바꿀 수 있으면 누구나 관리자가 된다. DB도 막는다(00009)
 * - 사진 → 2026-09-30부터 된다. 사진 창고(family-photos)에 512px 정사각형으로 올리고
 *   `avatar_url`에 `photo:{경로}`로 적는다(components/Avatar가 알아본다). 고른 즉시 올라가고,
 *   저장하지 않고 나가면 치운다. 저장하면 이전 얼굴 사진 파일을 치운다
 */

const EMOJIS = ['😀', '😎', '🥰', '🤓', '😺', '🐶', '🦊', '🐰', '🌸', '🌿', '⭐', '❤️', '🌈', '🎨', '🍀', '🦄'];

export default function ProfileScreen() {
  const me = useSession((st) => st.me);
  const patchMe = useSession((st) => st.patchMe);

  const family = useSession((st) => st.family);
  const members = useSession((st) => st.members);
  const records = useRecordsStore((st) => st.records);
  const [fullName, setFullName] = useState(me?.full_name ?? '');
  const [shortName, setShortName] = useState(me?.display_name ?? '');
  const [avatar, setAvatar] = useState<string | null>(me?.avatar_url ?? null);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // 가족 정보가 늦게 도착하면 그때 채운다
  useEffect(() => {
    if (!me) return;
    setFullName(me.full_name);
    setShortName(me.display_name);
    setAvatar(me.avatar_url);
  }, [me?.id]);

  useEffect(() => {
    getSession().then((sess) => setEmail(sess?.user.email ?? '')).catch(() => {});
  }, []);

  const [showEmoji, setShowEmoji] = useState(false);
  const emojiBg = useRef(new Animated.Value(0)).current;
  const emojiSlide = useRef(new Animated.Value(400)).current;
  const openEmoji = () => {
    setShowEmoji(true);
    Animated.parallel([
      Animated.timing(emojiBg, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(emojiSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };
  const closeEmoji = () =>
    Animated.parallel([
      Animated.timing(emojiBg, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(emojiSlide, { toValue: 400, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowEmoji(false));

  const pickEmoji = (e: string | null) => {
    setAvatar(e);
    closeEmoji();
  };

  /** 이번에 올렸지만 아직 저장하지 않은 얼굴 사진들 — 저장 안 하고 나가면 치운다 */
  const uploadedAvatars = useRef<string[]>([]);
  useEffect(() => () => { removePhotoFiles(uploadedAvatars.current); }, []);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const pickPhoto = async (from: 'library' | 'camera') => {
    if (!family) {
      showAlert('가족이 있어야 사진을 올릴 수 있어요', '사진은 우리 가족만 보는 곳에 모아둬요.');
      return;
    }
    closeEmoji();
    setUploadingAvatar(true);
    try {
      const path = await pickAndUploadAvatar(family.id, from);
      if (!path) return;
      uploadedAvatars.current.push(path);
      setAvatar(PHOTO_PREFIX + path);
    } catch (e) {
      showAlert('사진을 올리지 못했어요', dbErrorText(e));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const nextShort = shortName.trim();
  const shortChanged = !!me && nextShort !== me.display_name;
  const changed = !!me && (fullName.trim() !== me.full_name || avatar !== me.avatar_url || shortChanged);

  /** 내 옛 이름이 쓴 사람으로 적힌 기록 수 — 확인창에서 "몇 개가 함께 바뀌는지" 말해주려고 */
  const myRecordCount = me ? records.filter((r) => r.recordedBy === me.display_name).length : 0;

  /** 짧은 이름을 바꾼 뒤 — 이름이 적힌 것들을 다시 불러와 화면을 맞춘다 */
  const reloadAfterRename = async (name: string) => {
    if (!me || !family) return;
    patchMe({ display_name: name });
    const uid = me.user_id;
    await Promise.all([
      useRecordsStore.getState().load(family.id, uid),
      useEventsStore.getState().load(family.id, uid),
      // 가계부 설정(카드 주인·매달 넣는 거래)은 어른만 받아온다 (00010)
      ['admin', 'parent', 'elder'].includes(me.role) ? attachFinanceSettings(family.id) : Promise.resolve(),
    ]);
  };

  const doSave = async () => {
    if (!me) return;
    const name = fullName.trim();
    setSaving(true);
    try {
      if (shortChanged && family) {
        await renameMe(family.id, nextShort);
        await reloadAfterRename(nextShort);
      }
      await updateMyName(me.id, { fullName: name, avatarUrl: avatar });
      // 저장됐으니 — 이번에 올렸다가 안 쓰게 된 사진과, 이전 얼굴 사진 파일을 치운다
      const keep = avatarPhotoPath(avatar);
      const old = avatarPhotoPath(me.avatar_url);
      removePhotoFiles([...uploadedAvatars.current, ...(old ? [old] : [])].filter((p) => p !== keep));
      uploadedAvatars.current = [];
      patchMe({ full_name: name, avatar_url: avatar });
      showAlert('저장했어요', shortChanged
        ? `이제 기록에 '${nextShort}'${ro(nextShort)} 남아요. 지금까지 쓴 것도 함께 바뀌었어요.`
        : '가족 모두에게 바뀐 모습으로 보여요.');
    } catch (e) {
      // 우리 DB 함수는 이유를 한국어로 말한다. 모르는 오류는 그대로 — 틀린 안내보다 낫다
      showAlert('저장하지 못했어요', dbErrorText(e));
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (!me) return;
    if (!fullName.trim()) {
      showAlert('이름을 적어주세요', '가족이 부르는 이름이면 돼요.');
      return;
    }
    if (shortChanged) {
      if (!nextShort) {
        showAlert('기록에 남을 이름을 적어주세요', "짧게 부르는 이름이면 돼요. 예) '지수'");
        return;
      }
      if (nextShort.length > 10) {
        showAlert('조금만 짧게 적어주세요', '기록에 남는 이름은 10글자까지예요.');
        return;
      }
      if (nextShort.includes('|')) {
        showAlert('| 기호는 쓸 수 없어요', '가계부가 거래를 알아보는 표시에 쓰는 기호라서요.');
        return;
      }
      if (members.some((m) => m.id !== me.id && m.display_name === nextShort)) {
        showAlert(`가족 안에 이미 '${nextShort}'${iga(nextShort)} 있어요`, '기록에서 두 사람이 헷갈리지 않게 다른 이름을 골라주세요.');
        return;
      }
      showAlert(
        `'${nextShort}'${ro(nextShort)} 바꿀까요?`,
        `지금까지 '${me.display_name}'${ro(me.display_name)} 남은 기록 ${myRecordCount}개와 일정, 가계부의 쓴 사람도 함께 '${nextShort}'${ro(nextShort)} 바뀌어요.

다른 가족에는 영향이 없어요.`,
        [
          { text: '그냥 둘게요', style: 'cancel' },
          { text: '바꾸기', onPress: doSave },
        ]
      );
      return;
    }
    doSave();
  };

  if (!me) {
    return (
      <>
        <Stack.Screen options={{ title: '프로필' }} />
        <View style={s.emptyWrap}>
          <FontAwesome name="user-circle-o" size={40} color="#D4C8B0" />
          <Text style={s.emptyText}>가족에 들어오면 프로필을 꾸밀 수 있어요</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '프로필' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.avatarSection}>
          <TouchableOpacity style={s.avatar} activeOpacity={0.7} onPress={openEmoji} disabled={uploadingAvatar}>
            <Avatar avatar={avatar} initial={me.display_name} size={88} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={openEmoji} disabled={uploadingAvatar}>
            <Text style={s.changePhoto}>{uploadingAvatar ? '올리는 중…' : '사진이나 이모지 고르기'}</Text>
          </TouchableOpacity>
          <Text style={s.photoNote}>가족 목록에서 이름 옆에 보여요</Text>
        </View>

        <Text style={s.label}>이름</Text>
        <TextInput style={s.input} value={fullName} onChangeText={setFullName}
          placeholder="예) 김지수" placeholderTextColor="#BFAE99" />
        <Text style={s.help}>프로필과 가족 구성원 목록에 보여요</Text>

        <Text style={s.label}>기록에 남는 이름</Text>
        <TextInput style={s.input} value={shortName} onChangeText={setShortName} maxLength={10}
          placeholder="예) 지수" placeholderTextColor="#BFAE99" autoCorrect={false} />
        <Text style={s.help}>
          {shortChanged && nextShort
            ? `저장하면 지금까지 쓴 기록 ${myRecordCount}개도 '${nextShort}'${ro(nextShort)} 함께 바뀌어요`
            : `기록·일정·가계부에 이 이름으로 남아요${family ? ` · ${family.name}에서만 쓰는 이름이에요` : ''}`}
        </Text>

        <Text style={s.label}>이메일</Text>
        <View style={s.readonly}>
          <Text style={s.readonlyText}>{email || '…'}</Text>
        </View>
        <Text style={s.help}>로그인할 때 쓰는 주소예요</Text>

        <Text style={s.label}>역할</Text>
        <View style={s.readonly}>
          <Text style={s.readonlyText}>{ROLE_LABEL[me.role] ?? '가족'}</Text>
        </View>
        <Text style={s.help}>역할은 가족에 들어올 때 정해져요</Text>

        <TouchableOpacity
          style={[s.saveBtn, (!changed || saving) && s.saveBtnOff]}
          activeOpacity={0.8}
          disabled={!changed || saving}
          onPress={save}
        >
          <Text style={s.saveBtnText}>{saving ? '저장하는 중…' : changed ? '저장하기' : '바뀐 게 없어요'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showEmoji} transparent statusBarTranslucent animationType="none">
        <View style={s.modalWrap}>
          <Animated.View style={[s.modalBg, { opacity: emojiBg }]}>
            <Pressable style={s.fill} onPress={closeEmoji} />
          </Animated.View>
          <Animated.View style={[s.sheet, { transform: [{ translateY: emojiSlide }] }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>내 얼굴</Text>
            <Text style={s.sheetSub}>사진을 올리거나, 나를 닮은 이모지를 골라요</Text>
            <View style={s.photoRow}>
              <TouchableOpacity style={s.photoBtn} activeOpacity={0.7} onPress={() => pickPhoto('library')}>
                <FontAwesome name="photo" size={16} color="#2D5A3F" />
                <Text style={s.photoBtnText}>사진첩에서</Text>
              </TouchableOpacity>
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={s.photoBtn} activeOpacity={0.7} onPress={() => pickPhoto('camera')}>
                  <FontAwesome name="camera" size={16} color="#2D5A3F" />
                  <Text style={s.photoBtnText}>지금 찍기</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={s.emojiGrid}>
              {EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[s.emojiCell, avatar === e && s.emojiCellActive]}
                  activeOpacity={0.7}
                  onPress={() => pickEmoji(e)}
                >
                  <Text style={s.emojiCellText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {avatar && (
              <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={() => pickEmoji(null)}>
                <Text style={s.cancelText}>{avatarPhotoPath(avatar) ? '사진 빼고 이름 첫 글자로' : '이모지 빼고 이름 첫 글자로'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={closeEmoji}>
              <Text style={s.cancelText}>닫기</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  content: { padding: 20, paddingBottom: 40 },
  fill: { flex: 1 },
  emptyWrap: { flex: 1, backgroundColor: '#F9F8F5', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyText: { fontSize: 14, color: '#888', fontFamily: 'Pretendard', textAlign: 'center' },

  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatar: { marginBottom: 10 },
  photoRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EFF6F1', borderRadius: 12, paddingVertical: 12,
  },
  photoBtnText: { fontSize: 14, color: '#2D5A3F', fontFamily: 'PretendardBold' },
  changePhoto: { fontSize: 14, fontWeight: '600', color: '#4A8C6F', fontFamily: 'Pretendard' },
  photoNote: { fontSize: 12, color: '#A0A0A0', marginTop: 4, fontFamily: 'Pretendard' },

  label: { fontSize: 13, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, fontFamily: 'Pretendard' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard' },
  readonly: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1EFEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  readonlyText: { fontSize: 15, color: '#4A4A4A', fontFamily: 'Pretendard' },
  help: { fontSize: 12, color: '#888888', marginTop: 6, marginBottom: 20, lineHeight: 17, fontFamily: 'Pretendard' },

  saveBtn: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnOff: { backgroundColor: '#B8CFC3' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 },
  handle: { width: 36, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', textAlign: 'center', letterSpacing: -0.3 },
  sheetSub: { fontSize: 13, color: '#A0A0A0', textAlign: 'center', marginTop: 4, marginBottom: 18, fontFamily: 'Pretendard' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  emojiCell: { width: '22%', aspectRatio: 1, backgroundColor: '#F9F8F5', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA' },
  emojiCellActive: { borderColor: '#4A8C6F', backgroundColor: '#EFF6F1' },
  emojiCellText: { fontSize: 32 },
});
