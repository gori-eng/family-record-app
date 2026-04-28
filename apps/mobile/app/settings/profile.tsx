import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, Animated, Pressable, Image, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';

const ROLES = ['부', '모', '자녀'] as const;
type Role = typeof ROLES[number];

const EMOJIS = ['😀', '😎', '🥰', '🤓', '😺', '🐶', '🦊', '🐰', '🌸', '🌿', '⭐', '❤️', '🌈', '🎨', '🍀', '🦄'];

type AvatarMode = 'icon' | 'image' | 'emoji';

export default function ProfileScreen() {
  const [name, setName] = useState('김지수');
  const [email, setEmail] = useState('jisoo@family.com');
  const [role, setRole] = useState<Role>('모');

  const [avatarMode, setAvatarMode] = useState<AvatarMode>('icon');
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [avatarEmoji, setAvatarEmoji] = useState<string>('🌿');

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const photoBg = useRef(new Animated.Value(0)).current;
  const photoSlide = useRef(new Animated.Value(400)).current;
  const emojiBg = useRef(new Animated.Value(0)).current;
  const emojiSlide = useRef(new Animated.Value(400)).current;

  const openPhoto = () => {
    setShowPhotoModal(true);
    Animated.parallel([
      Animated.timing(photoBg, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(photoSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };
  const closePhoto = () =>
    Animated.parallel([
      Animated.timing(photoBg, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(photoSlide, { toValue: 400, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowPhotoModal(false));

  const openEmoji = () => {
    setShowEmojiModal(true);
    Animated.parallel([
      Animated.timing(emojiBg, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(emojiSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };
  const closeEmoji = () =>
    Animated.parallel([
      Animated.timing(emojiBg, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(emojiSlide, { toValue: 400, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowEmojiModal(false));

  const pickFromCamera = async () => {
    closePhoto();
    if (Platform.OS === 'web') {
      Alert.alert('지원 안 됨', '카메라 촬영은 모바일 앱에서만 사용할 수 있어요. 사진첩에서 불러오거나 이모지를 선택해주세요.');
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '카메라 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarImage(result.assets[0].uri);
      setAvatarMode('image');
    }
  };

  const pickFromLibrary = async () => {
    closePhoto();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진첩 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarImage(result.assets[0].uri);
      setAvatarMode('image');
    }
  };

  const chooseEmojiOption = () => {
    closePhoto();
    setTimeout(openEmoji, 220);
  };

  const selectEmoji = (e: string) => {
    setAvatarEmoji(e);
    setAvatarMode('emoji');
    closeEmoji();
  };

  return (
    <>
      <Stack.Screen options={{ title: '프로필 수정' }} />
      <ScrollView style={s.container}>
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            {avatarMode === 'image' && avatarImage ? (
              <Image source={{ uri: avatarImage }} style={s.avatarImage} />
            ) : avatarMode === 'emoji' ? (
              <Text style={s.avatarEmoji}>{avatarEmoji}</Text>
            ) : (
              <FontAwesome name="user" size={36} color="#4A8C6F" />
            )}
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={openPhoto}>
            <Text style={s.changePhoto}>사진 변경</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.label}>이름</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} />
        <Text style={s.label}>이메일</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Text style={s.label}>역할</Text>
        <View style={s.roleChips}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r}
              style={[s.chip, role === r && s.chipActive]}
              activeOpacity={0.7}
              onPress={() => setRole(r)}
            >
              <Text style={[s.chipText, role === r && s.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.saveBtn} activeOpacity={0.8}
          onPress={() => Alert.alert('저장 완료', '프로필이 업데이트되었습니다.')}>
          <Text style={s.saveBtnText}>저장하기</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Photo source picker modal */}
      <Modal visible={showPhotoModal} transparent statusBarTranslucent animationType="none">
        <View style={s.modalWrap}>
          <Animated.View style={[s.modalBg, { opacity: photoBg }]}>
            <Pressable style={{ flex: 1 }} onPress={closePhoto} />
          </Animated.View>
          <Animated.View style={[s.sheet, { transform: [{ translateY: photoSlide }] }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>프로필 사진 변경</Text>
            <Text style={s.sheetSub}>어떻게 바꿀까요?</Text>

            <TouchableOpacity style={s.option} activeOpacity={0.7} onPress={pickFromCamera}>
              <View style={[s.optionIcon, { backgroundColor: '#EFF6F1' }]}>
                <FontAwesome name="camera" size={18} color="#4A8C6F" />
              </View>
              <Text style={s.optionTitle}>카메라로 촬영</Text>
              <FontAwesome name="chevron-right" size={12} color="#C8C8C8" />
            </TouchableOpacity>

            <TouchableOpacity style={s.option} activeOpacity={0.7} onPress={pickFromLibrary}>
              <View style={[s.optionIcon, { backgroundColor: '#FFF3E0' }]}>
                <FontAwesome name="picture-o" size={18} color="#E6A817" />
              </View>
              <Text style={s.optionTitle}>사진첩에서 선택</Text>
              <FontAwesome name="chevron-right" size={12} color="#C8C8C8" />
            </TouchableOpacity>

            <TouchableOpacity style={s.option} activeOpacity={0.7} onPress={chooseEmojiOption}>
              <View style={[s.optionIcon, { backgroundColor: '#F3E5F5' }]}>
                <FontAwesome name="smile-o" size={18} color="#9C27B0" />
              </View>
              <Text style={s.optionTitle}>이모지로 대체</Text>
              <FontAwesome name="chevron-right" size={12} color="#C8C8C8" />
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelBtn} activeOpacity={0.7} onPress={closePhoto}>
              <Text style={s.cancelText}>취소</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Emoji picker modal */}
      <Modal visible={showEmojiModal} transparent statusBarTranslucent animationType="none">
        <View style={s.modalWrap}>
          <Animated.View style={[s.modalBg, { opacity: emojiBg }]}>
            <Pressable style={{ flex: 1 }} onPress={closeEmoji} />
          </Animated.View>
          <Animated.View style={[s.sheet, { transform: [{ translateY: emojiSlide }] }]}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>이모지 선택</Text>
            <Text style={s.sheetSub}>프로필에 사용할 이모지를 골라주세요</Text>
            <View style={s.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[s.emojiCell, avatarEmoji === e && avatarMode === 'emoji' && s.emojiCellActive]}
                  activeOpacity={0.7}
                  onPress={() => selectEmoji(e)}
                >
                  <Text style={s.emojiCellText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
  container: { flex: 1, backgroundColor: '#F9F8F5', padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#EFF6F1', justifyContent: 'center', alignItems: 'center', marginBottom: 10, overflow: 'hidden' },
  avatarImage: { width: 88, height: 88 },
  avatarEmoji: { fontSize: 48 },
  changePhoto: { fontSize: 14, fontWeight: '600', color: '#4A8C6F', fontFamily: 'Pretendard' },
  label: { fontSize: 13, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, fontFamily: 'Pretendard' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#1F1F1F', marginBottom: 20, fontFamily: 'Pretendard' },
  roleChips: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  chip: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA' },
  chipActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  chipTextActive: { color: '#FFFFFF' },
  saveBtn: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36 },
  handle: { width: 36, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', textAlign: 'center', letterSpacing: -0.3 },
  sheetSub: { fontSize: 13, color: '#A0A0A0', textAlign: 'center', marginTop: 4, marginBottom: 18, fontFamily: 'Pretendard' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F9F8F5', borderRadius: 14, padding: 14, marginBottom: 8 },
  optionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  emojiCell: { width: '22%', aspectRatio: 1, backgroundColor: '#F9F8F5', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA' },
  emojiCellActive: { borderColor: '#4A8C6F', backgroundColor: '#EFF6F1' },
  emojiCellText: { fontSize: 32 },
});
