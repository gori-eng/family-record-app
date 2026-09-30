/**
 * 비밀번호를 잊었을 때 — 메일로 재설정 링크를 보낸다.
 *
 * 제품 검토(2026-09-30) 🔴: 이 화면이 없으면 조부모가 비밀번호를 잊는 순간 운영자가 대시보드에서 손봐줘야 했다.
 * 링크는 웹이면 `/reset-password`, 휴대폰이면 `familog://reset-password`로 돌아온다.
 */
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { showAlert } from '../../components/AppAlert';
import { requestPasswordReset } from '@core/supabase';
import { authErrorMessage } from '../../lib/afterAuth';

/** 메일 링크가 돌아올 주소 — 대시보드 Redirect URLs에 등록돼 있어야 한다 */
export const resetRedirectUrl = () =>
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}/reset-password`
    : 'familog://reset-password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const v = email.trim();
    if (!v) { showAlert('이메일을 적어주세요', '가입할 때 쓴 주소예요.'); return; }
    setBusy(true);
    try {
      await requestPasswordReset(v, resetRedirectUrl());
      showAlert('메일을 보냈어요', `${v}로 보낸 링크를 누르면 새 비밀번호를 정할 수 있어요.\n\n메일이 안 보이면 스팸함도 봐주세요.`, [
        { text: '확인', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e) {
      showAlert('메일을 보내지 못했어요', authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.form}>
        <Text style={s.title}>비밀번호를 잊으셨나요?</Text>
        <Text style={s.desc}>가입한 이메일을 적어주세요. 새 비밀번호를 정할 수 있는 링크를 보내드릴게요.</Text>
        <Text style={s.label}>이메일</Text>
        <TextInput style={s.input} placeholder="example@email.com" placeholderTextColor="#A39682"
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoFocus />
        <TouchableOpacity style={[s.btn, busy && s.btnOff]} onPress={send} disabled={busy} activeOpacity={0.8}>
          <Text style={s.btnText}>{busy ? '보내고 있어요' : '링크 보내기'}</Text>
        </TouchableOpacity>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={s.back}><Text style={s.backText}>로그인으로 돌아가기</Text></TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5', justifyContent: 'center' },
  form: { paddingHorizontal: 28 },
  title: { fontSize: 22, color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 8 },
  desc: { fontSize: 14, color: '#4A4A4A', fontFamily: 'Pretendard', lineHeight: 21, marginBottom: 28 },
  label: { fontSize: 13, color: '#4A4A4A', fontFamily: 'PretendardBold', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard', marginBottom: 20 },
  btn: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnOff: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'PretendardBold' },
  back: { alignItems: 'center', paddingVertical: 18 },
  backText: { color: '#4A8C6F', fontSize: 14, fontFamily: 'Pretendard' },
});
