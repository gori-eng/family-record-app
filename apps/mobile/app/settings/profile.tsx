import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, Animated, Pressable } from 'react-native';
import { showAlert } from '../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { getSession, updateMyName } from '@core/supabase';
import { useSession } from '../../store/session';
import { ROLE_LABEL } from '../../store/family';
import { ro } from '../../lib/korean';

/**
 * 프로필 고치기.
 *
 * ── 예전 화면은 가짜였다 (2026-09-29) ─────────────────────
 * '김지수' · 'jisoo@family.com' · 역할 '모'가 박혀 있었고, 저장하기는 **아무것도 저장하지 않으면서**
 * "프로필이 업데이트되었습니다"라고 알렸다. 거짓으로 안심시키는 화면이라 진짜로 만들었다.
 *
 * ── 고칠 수 있는 것 / 없는 것 ────────────────────────────
 * - 전체 이름(full_name) · 이모지 → 고친다. DB에 저장되고 가족 모두에게 보인다
 * - 짧은 이름(display_name) → **보기만.** 기록이 이 이름 글자로 쓴 사람을 가리켜서,
 *   바꾸면 지금까지 쓴 기록과 끊긴다(기존 기록까지 함께 고치는 건 아직 없다)
 * - 이메일 → 로그인 계정이라 보기만
 * - 역할 → 보기만. 스스로 바꿀 수 있으면 누구나 관리자가 된다. DB도 막는다(00009)
 * - 사진 → 올려둘 저장소가 아직 없어 '준비 중'. 예전엔 고르면 보였다가 새로고침하면 사라졌다
 */

const EMOJIS = ['😀', '😎', '🥰', '🤓', '😺', '🐶', '🦊', '🐰', '🌸', '🌿', '⭐', '❤️', '🌈', '🎨', '🍀', '🦄'];

export default function ProfileScreen() {
  const me = useSession((st) => st.me);
  const patchMe = useSession((st) => st.patchMe);

  const [fullName, setFullName] = useState(me?.full_name ?? '');
  const [avatar, setAvatar] = useState<string | null>(me?.avatar_url ?? null);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // 가족 정보가 늦게 도착하면 그때 채운다
  useEffect(() => {
    if (!me) return;
    setFullName(me.full_name);
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

  const changed = !!me && (fullName.trim() !== me.full_name || avatar !== me.avatar_url);

  const save = async () => {
    if (!me) return;
    const name = fullName.trim();
    if (!name) {
      showAlert('이름을 적어주세요', '가족이 부르는 이름이면 돼요.');
      return;
    }
    setSaving(true);
    try {
      await updateMyName(me.id, { fullName: name, avatarUrl: avatar });
      patchMe({ full_name: name, avatar_url: avatar });
      showAlert('저장했어요', '가족 모두에게 바뀐 모습으로 보여요.');
    } catch (e: any) {
      // 모르는 오류는 그대로 보여준다 — 틀린 안내보다 낫다
      showAlert('저장하지 못했어요', String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
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
          <TouchableOpacity style={s.avatar} activeOpacity={0.7} onPress={openEmoji}>
            {avatar
              ? <Text style={s.avatarEmoji}>{avatar}</Text>
              : <Text style={s.avatarInitial}>{me.display_name.slice(0, 1)}</Text>}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={openEmoji}>
            <Text style={s.changePhoto}>이모지 고르기</Text>
          </TouchableOpacity>
          <Text style={s.photoNote}>사진 올리기는 준비 중이에요</Text>
        </View>

        <Text style={s.label}>이름</Text>
        <TextInput style={s.input} value={fullName} onChangeText={setFullName}
          placeholder="예) 김지수" placeholderTextColor="#BFAE99" />
        <Text style={s.help}>프로필과 가족 구성원 목록에 보여요</Text>

        <Text style={s.label}>기록에 남는 이름</Text>
        <View style={s.readonly}>
          <Text style={s.readonlyText}>{me.display_name}</Text>
          <FontAwesome name="lock" size={12} color="#BFAE99" />
        </View>
        <Text style={s.help}>
          지금까지 쓴 기록이 '{me.display_name}'{ro(me.display_name)} 이어져 있어서, 이 이름은 아직 바꿀 수 없어요
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
            <Text style={s.sheetTitle}>나를 닮은 이모지</Text>
            <Text style={s.sheetSub}>가족 목록에서 이름 옆에 보여요</Text>
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
                <Text style={s.cancelText}>이모지 빼고 이름 첫 글자로</Text>
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
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#EFF6F1', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarEmoji: { fontSize: 48 },
  avatarInitial: { fontSize: 34, color: '#4A8C6F', fontFamily: 'PretendardBold' },
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
