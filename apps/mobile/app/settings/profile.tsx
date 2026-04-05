import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';

export default function ProfileScreen() {
  const [name, setName] = useState('김지수');
  const [email, setEmail] = useState('jisoo@family.com');

  return (
    <>
      <Stack.Screen options={{ title: '프로필 수정' }} />
      <ScrollView style={s.container}>
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <FontAwesome name="user" size={36} color="#C85A4A" />
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={s.changePhoto}>사진 변경</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.label}>이름</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} />
        <Text style={s.label}>이메일</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Text style={s.label}>역할</Text>
        <View style={s.roleChips}>
          {['관리자', '부모', '자녀', '어르신'].map((r, i) => (
            <TouchableOpacity key={i} style={[s.chip, i === 0 && s.chipActive]} activeOpacity={0.7}>
              <Text style={[s.chipText, i === 0 && s.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.saveBtn} activeOpacity={0.8}
          onPress={() => Alert.alert('저장 완료', '프로필이 업데이트되었습니다.')}>
          <Text style={s.saveBtnText}>저장하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0', padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFDAB9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  changePhoto: { fontSize: 14, fontWeight: '600', color: '#C85A4A' },
  label: { fontSize: 13, fontWeight: '600', color: '#5C4A32', marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E8D8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: '#2D2D2D', marginBottom: 20 },
  roleChips: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E8D8' },
  chipActive: { backgroundColor: '#C85A4A', borderColor: '#C85A4A' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#7A6B55' },
  chipTextActive: { color: '#FFFFFF' },
  saveBtn: { backgroundColor: '#C85A4A', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
